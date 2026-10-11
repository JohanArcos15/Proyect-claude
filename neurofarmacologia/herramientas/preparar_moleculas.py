"""Estructuras químicas de todos los fármacos de la app.

Para cada SMILES:
1. Comprueba la fórmula molecular contra la esperada (falla si no coincide).
2. Genera una conformación 3D de mínima energía (ETKDGv3 + MMFF94s).
3. Dibuja la estructura 2D en SVG (paleta para fondo oscuro) resaltando los
   grupos químicos que explican su farmacología (relación estructura-actividad).
4. Calcula descriptores: masa molar, cLogP (Crippen), TPSA, donantes y
   aceptores de puentes de H, enlaces rotables.

    pip install rdkit
    python3 herramientas/preparar_moleculas.py   → src/datos/moleculas.json.gz
"""
import gzip
import json
import re
from pathlib import Path

import numpy as np
from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, Crippen, Descriptors, Lipinski, rdMolDescriptors
from rdkit.Chem.Draw import rdMolDraw2D

RDLogger.DisableLog("rdApp.warning")
RAIZ = Path(__file__).resolve().parent.parent

# Colores de los grupos resaltados (RGB 0-1) — coinciden con la leyenda de la app
C = {
    "azul": (0.30, 0.64, 1.0), "naranja": (1.0, 0.56, 0.24), "rosa": (1.0, 0.36, 0.66),
    "verde": (0.25, 0.84, 0.61), "violeta": (0.64, 0.48, 1.0), "amarillo": (1.0, 0.82, 0.30),
    "turquesa": (0.24, 0.84, 0.82), "rojo": (1.0, 0.42, 0.37),
}

AMINA = "[NX3;H0,H1,H2;!$(N-C=[O,S,N]);!$(N-a);!$(N-S);!$(N=*);!$(N#*);!$(N-N)]"
ANILLO_AR = "c1ccccc1"

# id: (SMILES, fórmula esperada, [(SMARTS, etiqueta, color), ...])
MOLECULAS = {
    # --- Analgesia: opioides ---
    "morfina": ("CN1CC[C@]23[C@@H]4[C@H]1CC5=C2C(=C(C=C5)O)O[C@H]3[C@H](C=C4)O", "C17H19NO3",
                [(AMINA, "Amina básica (protonada a pH 7,4): ancla iónica en el receptor μ", "azul"), ("c[OX2H]", "Fenol 3-OH: puente de H clave para la afinidad μ", "naranja")]),
    "codeina": ("CN1CC[C@]23[C@@H]4[C@H]1CC5=C2C(=C(C=C5)OC)O[C@H]3[C@H](C=C4)O", "C18H21NO3",
                [("c[OX2][CH3]", "3-metoxi: profármaco, CYP2D6 lo O-desmetila a morfina", "rosa"), (AMINA, "Amina básica", "azul")]),
    "oxicodona": ("CN1CC[C@]23[C@@H]4C(=O)CC[C@]2([C@H]1CC5=C3C(=C(C=C5)OC)O4)O", "C18H21NO4",
                  [("[CX4][OX2H]", "14-OH: aumenta la potencia μ", "verde"), ("C(=O)", "6-ceto", "violeta"), ("c[OX2][CH3]", "3-metoxi", "rosa"), (AMINA, "Amina básica", "azul")]),
    "hidromorfona": ("CN1CC[C@]23[C@@H]4C(=O)CC[C@H]2[C@H]1CC5=C3C(=C(C=C5)O)O4", "C17H19NO3",
                     [("[#6][CX3](=O)[#6]", "6-ceto (dihidromorfinona): más lipófila y potente que la morfina", "violeta"), ("c[OX2H]", "Fenol 3-OH", "naranja"), (AMINA, "Amina básica", "azul")]),
    "fentanilo": ("CCC(=O)N(C1CCN(CC1)CCC2=CC=CC=C2)C3=CC=CC=C3", "C22H28N2O",
                  [("C1CCNCC1", "4-anilidopiperidina: muy lipófila, cruza rápido la BHE", "azul"), ("CCC(=O)N", "Propionanilida", "violeta"), ("CCc1ccccc1", "Fenetilo: aumenta mucho la potencia", "naranja")]),
    "sufentanilo": ("CCC(=O)N(C1=CC=CC=C1)C2(CCN(CC2)CCC3=CC=CS3)COC", "C22H30N2O2S",
                    [("c1ccsc1", "Tiofeno (isóstero del fenilo)", "amarillo"), ("COC", "Metoximetilo en C4: 5-10 veces más potente que el fentanilo", "verde"), ("C1CCNCC1", "Piperidina", "azul")]),
    "tramadol": ("CN(C)C[C@H]1CCCC[C@@]1(C2=CC(=CC=C2)OC)O", "C16H25NO2",
                 [("c[OX2][CH3]", "Metoxi: CYP2D6 lo convierte en O-desmetiltramadol (agonista μ)", "rosa"), (AMINA, "Amina terciaria", "azul")]),
    "metadona": ("CCC(=O)C(CC(C)N(C)C)(C1=CC=CC=C1)C2=CC=CC=C2", "C21H27NO",
                 [("C(c1ccccc1)(c1ccccc1)", "Difenilo: estructura abierta (no morfinano)", "naranja"), (AMINA, "Amina básica", "azul")]),
    "naloxona": ("C=CCN1CC[C@]23[C@@H]4C(=O)CC[C@]2([C@H]1CC5=C3C(=C(C=C5)O)O4)O", "C19H21NO4",
                 [("C=CCN", "N-alilo: cambiar N-metilo por N-alilo convierte un agonista en antagonista", "rojo"), ("c[OX2H]", "Fenol 3-OH", "naranja")]),
    # --- Analgesia: no opioides ---
    "ibuprofeno": ("CC(C)CC1=CC=C(C=C1)C(C)C(=O)O", "C13H18O2",
                   [("C(=O)[OX2H]", "Ácido carboxílico: interactúa con Arg120 de la COX", "rojo"), ("CC(C(=O)O)c", "Ácido 2-arilpropiónico («profeno»)", "naranja")]),
    "naproxeno": ("C[C@@H](C1=CC2=C(C=C1)C=C(C=C2)OC)C(=O)O", "C14H14O3",
                  [("C(=O)[OX2H]", "Ácido carboxílico", "rojo"), ("c1ccc2ccccc2c1", "Naftaleno", "naranja")]),
    "diclofenaco": ("OC(=O)CC1=CC=CC=C1NC2=C(Cl)C=CC=C2Cl", "C14H11Cl2NO2",
                    [("C(=O)[OX2H]", "Ácido arilacético", "rojo"), ("Clc1cccc(Cl)c1N", "2,6-dicloroanilina: fuerza la torsión de los anillos", "verde")]),
    "aspirina": ("CC(=O)OC1=CC=CC=C1C(=O)O", "C9H8O4",
                 [("CC(=O)Oc", "Acetilo: acetila la Ser530 de la COX (inhibición irreversible)", "rosa"), ("C(=O)[OX2H]", "Ácido carboxílico", "rojo")]),
    "celecoxib": ("CC1=CC=C(C=C1)C2=CC(=NN2C3=CC=C(C=C3)S(=O)(=O)N)C(F)(F)F", "C17H14F3N3O2S",
                  [("S(=O)(=O)[NH2]", "Sulfonamida: entra en el bolsillo lateral de la COX-2 (selectividad)", "amarillo"), ("C(F)(F)F", "Trifluorometilo", "verde")]),
    "paracetamol": ("CC(=O)NC1=CC=C(C=C1)O", "C8H9NO2",
                    [("c[OX2H]", "Fenol", "naranja"), ("CC(=O)N", "Acetamida: CYP2E1 la oxida a NAPQI (hepatotóxico)", "rosa")]),
    "metamizol": ("CN(CS(=O)(=O)O)C1=C(C)N(C)N(C1=O)C2=CC=CC=C2", "C13H17N3O4S",
                  [("O=[#6]1~[#6]~[#6]~[#7]~[#7]~1", "Pirazolona", "violeta"), ("CS(=O)(=O)[OX2H]", "Metanosulfonato: se hidroliza a 4-metilaminoantipirina (activo)", "amarillo")]),
    "acetilcisteina": ("CC(=O)N[C@@H](CS)C(=O)O", "C5H9NO3S",
                       [("[SX2H]", "Tiol: precursor de glutatión que neutraliza el NAPQI", "amarillo")]),
    "gabapentina": ("C1CCC(CC1)(CC(=O)O)CN", "C9H17NO2",
                    [("NCCCC(=O)[OX2H]", "Esqueleto de GABA… pero no actúa en receptores GABA (se une a α2δ)", "azul")]),
    "pregabalina": ("CC(C)C[C@H](CC(=O)O)CN", "C8H17NO2",
                    [("NCCCC(=O)[OX2H]", "Esqueleto de GABA (análogo 3-isobutilo); diana real: α2δ", "azul")]),
    "ketamina": ("CNC1(CCCCC1=O)C2=CC=CC=C2Cl", "C13H16ClNO",
                 [("NC1(CCCCC1=O)c", "Arilciclohexilamina (como la fenciclidina)", "turquesa"), ("Clc", "2-cloro", "verde")]),
    # --- Anestesia ---
    "propofol": ("CC(C)C1=C(C(=CC=C1)C(C)C)O", "C12H18O",
                 [("c[OX2H]", "Fenol", "naranja"), ("[CH](C)(C)c", "2,6-diisopropilo: muy lipófilo (emulsión lipídica)", "verde")]),
    "etomidato": ("CCOC(=O)C1=CN=CN1[C@H](C)C2=CC=CC=C2", "C14H16N2O2",
                  [("c1cncn1", "Imidazol: inhibe la 11β-hidroxilasa suprarrenal", "violeta"), ("C(=O)OCC", "Éster etílico (hidrolizado por esterasas)", "rosa")]),
    "tiopental": ("CCCC(C)C1(C(=O)NC(=S)NC1=O)CC", "C11H18N2O2S",
                  [("C(=S)", "C2=S (tiobarbitúrico): más lipófilo → acción ultracorta", "amarillo"), ("C1(=O)NC(=S)NC(=O)C1", "Anillo de ácido barbitúrico", "azul")]),
    "sevoflurano": ("C(C(F)(F)F)(C(F)(F)F)OCF", "C4H3F7O",
                    [("COC", "Éter", "violeta"), ("C(F)(F)F", "Flúor: poco soluble en sangre → inducción y despertar rápidos", "verde")]),
    "desflurano": ("FC(F)OC(F)C(F)(F)F", "C3H2F6O", [("COC", "Éter", "violeta"), ("[F]", "Totalmente fluorado: el de menor solubilidad", "verde")]),
    "isoflurano": ("FC(F)OC(Cl)C(F)(F)F", "C3H2ClF5O", [("COC", "Éter", "violeta"), ("Cl", "Cloro", "verde")]),
    "halotano": ("FC(F)(F)C(Cl)Br", "C2HBrClF3", [("Br", "Bromo y cloro: más metabolismo hepático (hepatitis por halotano)", "rojo"), ("Cl", "Cloro", "verde")]),
    "oxido_nitroso": ("[N-]=[N+]=O", "N2O", []),
    "lidocaina": ("CCN(CC)CC(=O)NC1=C(C)C=CC=C1C", "C14H22N2O",
                  [("c1ccccc1", "Parte lipófila (aromática)", "naranja"), ("C(=O)N", "Enlace amida → metabolismo hepático, pocas alergias", "violeta"), (AMINA, "Amina terciaria (pKa 7,9): forma ionizada activa", "azul")]),
    "bupivacaina": ("CCCCN1CCCCC1C(=O)NC2=C(C)C=CC=C2C", "C18H28N2O",
                    [("c1ccccc1", "Parte lipófila", "naranja"), ("C(=O)N", "Amida", "violeta"), ("CCCCN", "N-butilo: más lipófila → más potente, larga y cardiotóxica", "rojo")]),
    "procaina": ("CCN(CC)CCOC(=O)C1=CC=C(C=C1)N", "C13H20N2O2",
                 [("Nc1ccc(cc1)C(=O)O", "PABA (ácido p-aminobenzoico): responsable de alergias", "rosa"), ("C(=O)OC", "Enlace éster → hidrólisis por colinesterasa plasmática", "violeta"), (AMINA, "Amina terciaria (pKa 8,9)", "azul")]),
    "succinilcolina": ("C[N+](C)(C)CCOC(=O)CCC(=O)OCC[N+](C)(C)C", "C14H30N2O4+2",
                       [("C[N+](C)(C)CCOC(=O)", "Dos moléculas de acetilcolina unidas: agonista nicotínico despolarizante", "verde")]),
    "rocuronio": ("CC(=O)O[C@H]1[C@H](C[C@@H]2[C@@]1(CC[C@H]3[C@H]2CC[C@@H]4[C@@]3(C[C@@H]([C@H](C4)O)N5CCOCC5)C)C)[N+]6(CCCC6)CC=C", "C32H53N2O4+",
                  [("[N+]", "Amonio cuaternario: no cruza la BHE, compite con la ACh en la placa", "verde"), ("C1CCC2C(C1)CCC1C2CCC2CCCC12", "Esqueleto esteroideo", "violeta")]),
    "dantroleno": ("C1C(=O)NC(=O)N1/N=C/C2=CC=C(O2)C3=CC=C(C=C3)[N+](=O)[O-]", "C14H10N4O5",
                   [("C1C(=O)NC(=O)N1", "Hidantoína", "azul"), ("[N+](=O)[O-]", "Nitrofenilo", "rojo"), ("c1ccoc1", "Furano", "naranja")]),
    "droperidol": ("C1CN(CC=C1N2C3=CC=CC=C3NC2=O)CCCC(=O)C4=CC=C(C=C4)F", "C22H22FN3O2",
                   [("O=C(CCCN)c1ccc(F)cc1", "4-fluorobutirofenona (como el haloperidol)", "rosa"), ("O=c1[nH]c2ccccc2n1", "Bencimidazolona", "violeta")]),
    # --- Sedación ---
    "midazolam": ("CC1=NC=C2N1C3=C(C=C(C=C3)Cl)C(=NC2)C4=CC=CC=C4F", "C18H13ClFN3",
                  [("c1ncc[n]1", "Imidazol fusionado (pKa 6): a pH < 4 el anillo se abre y es hidrosoluble", "violeta"), ("[#7]1~[#6]~[#6]~[#7]~[#6]~[#6]~[#6]1", "Anillo 1,4-diazepina", "azul"), ("Fc", "2'-flúor", "verde")]),
    "dexmedetomidina": ("C[C@@H](C1=CC=CC(=C1C)C)C2=CN=CN2", "C13H16N2",
                        [("c1cnc[nH]1", "Imidazol: reconoce el receptor α2", "violeta"), ("Cc1cccc(C)c1", "2,3-dimetilfenilo", "naranja")]),
    # --- Hipnosis ---
    "zolpidem": ("CC1=CC=C(C=C1)C2=C(N3C=C(C=CC3=N2)C)CC(=O)N(C)C", "C19H21N3O",
                 [("c1cn2ccccc2n1", "Imidazopiridina: no es benzodiacepina, pero usa su sitio (selectivo α1)", "turquesa"), ("CC(=O)N(C)C", "Dimetilacetamida", "violeta")]),
    "eszopiclona": ("CN1CCN(CC1)C(=O)O[C@@H]2C3=NC=CN=C3C(=O)N2C4=NC=C(C=C4)Cl", "C17H17ClN6O3",
                    [("O=C1NCc2nccnc21", "Ciclopirrolona", "turquesa"), ("C1CNCCN1", "Metilpiperazina", "azul")]),
    "triazolam": ("CC1=NN=C2N1C3=C(C=C(C=C3)Cl)C(=NC2)C4=CC=CC=C4Cl", "C17H12Cl2N4",
                  [("c1nncn1", "Triazol fusionado: acción corta y potente", "violeta"), ("[#7]1~[#6]~[#6]~[#7]~[#6]~[#6]~[#6]1", "Anillo 1,4-diazepina", "azul")]),
    "suvorexant": ("C[C@@H]1CCN(CCN1C(=O)C2=C(C=CC(=C2)C)N3N=CC=N3)C4=NC5=C(O4)C=CC(=C5)Cl", "C23H23ClN6O2",
                   [("C1CNCCNC1", "1,4-diazepano", "azul"), ("c1ncc(o1)", "Benzoxazol", "naranja"), ("n1nccn1", "Triazol", "violeta")]),
    "ramelteon": ("CCC(=O)NCC[C@@H]1CCC2=C1C3=C(C=C2)OCC3", "C16H21NO2",
                  [("CC(=O)NCC", "Cadena N-acilaminoetilo (como en la melatonina)", "violeta"), ("c1ccc2OCCc2c1", "Dihidrobenzofurano (isóstero del indol)", "naranja")]),
    "melatonina": ("CC(=O)NCCC1=CNC2=C1C=C(C=C2)OC", "C13H16N2O2",
                   [("CC(=O)NCC", "N-acetilaminoetilo", "violeta"), ("c1ccc2[nH]ccc2c1", "Indol (derivado del triptófano)", "naranja"), ("c[OX2][CH3]", "5-metoxi", "rosa")]),
    "difenhidramina": ("CN(C)CCOC(C1=CC=CC=C1)C2=CC=CC=C2", "C17H21NO",
                       [("C(c1ccccc1)c1ccccc1", "Difenilmetilo: muy lipófilo, cruza la BHE (sedación)", "naranja"), (AMINA, "Amina terciaria", "azul")]),
    "doxepina": ("CN(C)CCC=C1C2=CC=CC=C2COC3=CC=CC=C31", "C19H21NO",
                 [("c1ccc2c(c1)COc1ccccc1C2", "Tricíclico dibenzoxepina", "naranja"), (AMINA, "Amina terciaria", "azul")]),
    # --- Ansiolíticos ---
    "diazepam": ("CN1C(=O)CN=C(C2=C1C=CC(=C2)Cl)C3=CC=CC=C3", "C16H13ClN2O",
                 [("[#7]1~[#6]~[#6]~[#7]~[#6]~[#6]~[#6]1", "Anillo 1,4-diazepina", "azul"), ("Clc", "7-cloro (atractor de electrones): necesario para la actividad", "verde"), ("[CH3][$([NX3](C=O)c)]", "N1-metilo: se desmetila a nordazepam (activo, t½ larga)", "rosa")]),
    "alprazolam": ("CC1=NN=C2N1C3=C(C=C(C=C3)Cl)C(=NC2)C4=CC=CC=C4", "C17H13ClN4",
                   [("c1nncn1", "Triazol fusionado", "violeta"), ("[#7]1~[#6]~[#6]~[#7]~[#6]~[#6]~[#6]1", "Anillo 1,4-diazepina", "azul"), ("Clc", "8-cloro", "verde")]),
    "lorazepam": ("C1=CC=C(C(=C1)C2=NC(C(=O)NC3=C2C=C(C=C3)Cl)O)Cl", "C15H10Cl2N2O2",
                  [("[CX4][OX2H]", "3-OH: se glucuronida directamente (sin CYP)", "rosa"), ("[#7]1~[#6]~[#6]~[#7]~[#6]~[#6]~[#6]1", "Anillo 1,4-diazepina", "azul"), ("Clc", "Cloros", "verde")]),
    "clonazepam": ("C1C(=O)NC2=C(C=C(C=C2)[N+](=O)[O-])C(=N1)C3=CC=CC=C3Cl", "C15H10ClN3O3",
                   [("[N+](=O)[O-]", "7-nitro: alta potencia anticonvulsiva", "rojo"), ("[#7]1~[#6]~[#6]~[#7]~[#6]~[#6]~[#6]1", "Anillo 1,4-diazepina", "azul"), ("Clc", "2'-cloro", "verde")]),
    "buspirona": ("C1CCC2(C1)CC(=O)N(C(=O)C2)CCCCN3CCN(CC3)C4=NC=CC=N4", "C21H31N5O2",
                  [("c1ncccn1", "Pirimidinilpiperazina (arilpiperazina): reconoce 5-HT1A", "violeta"), ("O=C1CC2(CCCC2)CC(=O)N1", "Azaspirodecanodiona", "naranja")]),
    "sertralina": ("CN[C@H]1CC[C@H](C2=CC=CC=C12)C3=CC(=C(C=C3)Cl)Cl", "C17H17Cl2N",
                   [("Clc1ccccc1Cl", "3,4-diclorofenilo", "verde"), (AMINA, "Amina secundaria", "azul")]),
    "escitalopram": ("CN(C)CCC[C@@]1(C2=C(CO1)C=C(C=C2)C#N)C3=CC=C(C=C3)F", "C20H21FN2O",
                     [("C#N", "Nitrilo", "violeta"), ("Fc", "4-flúor", "verde"), (AMINA, "Amina terciaria", "azul")]),
    "hidroxicina": ("C1CN(CCN1CCOCCO)C(C2=CC=CC=C2)C3=CC=C(C=C3)Cl", "C21H27ClN2O2",
                    [("C(c1ccccc1)c1ccccc1", "Difenilmetilo (benzhidrilo)", "naranja"), ("C1CNCCN1", "Piperazina", "azul")]),
    "flumazenil": ("CCOC(=O)C1=C2CN(C(=O)C3=C(N2C=N1)C=CC(=C3)F)C", "C15H14FN3O3",
                   [("c1cncn1", "Imidazobenzodiacepina sin fenilo en C5: se une pero no activa", "violeta"), ("C(=O)OCC", "Éster etílico: hidrólisis hepática rápida (t½ ≈ 1 h)", "rosa")]),
    # --- Barbitúricos ---
    "fenobarbital": ("CCC1(C(=O)NC(=O)NC1=O)C2=CC=CC=C2", "C12H12N2O3",
                     [("C1(=O)NC(=O)NC(=O)C1", "Ácido barbitúrico (pirimidina-2,4,6-triona)", "azul"), ("c1ccccc1", "5-fenilo: acción anticonvulsiva", "naranja")]),
    "pentobarbital": ("CCCC(C)C1(C(=O)NC(=O)NC1=O)CC", "C11H18N2O3",
                      [("C1(=O)NC(=O)NC(=O)C1", "Ácido barbitúrico", "azul"), ("CCCC(C)[CX4](C=O)C=O", "5-(1-metilbutilo): ramificado y lipófilo", "verde")]),
    "secobarbital": ("CCCC(C)C1(C(=O)NC(=O)NC1=O)CC=C", "C12H18N2O3",
                     [("C1(=O)NC(=O)NC(=O)C1", "Ácido barbitúrico", "azul"), ("CC=C", "5-alilo", "verde")]),
    "metohexital": ("CCC#CC(C)C1(C(=O)N(C(=O)NC1=O)C)CC=C", "C14H18N2O3",
                    [("[CH3][$([NX3](C=O)C=O)]", "N-metilo: más lipófilo → ultracorto (pero puede causar mioclonías)", "rosa"), ("C1(=O)NC(=O)NC(=O)C1", "Anillo barbitúrico", "azul")]),
    "primidona": ("CCC1(C(=O)NCNC1=O)C2=CC=CC=C2", "C12H14N2O2",
                  [("C1(=O)NCNC(=O)C1", "Desoxibarbitúrico: C2 sin oxígeno; se oxida a fenobarbital", "azul")]),
    # --- Antiepilépticos ---
    "fenitoina": ("C1=CC=C(C=C1)C2(C(=O)NC(=O)N2)C3=CC=CC=C3", "C15H12N2O2",
                  [("C1(=O)NC(=O)NC1", "Hidantoína (imidazolidina-2,4-diona)", "azul"), ("C(c1ccccc1)c1ccccc1", "5,5-difenilo", "naranja")]),
    "carbamazepina": ("C1=CC=C2C(=C1)C=CC3=CC=CC=C3N2C(=O)N", "C15H12N2O",
                      [("NC(=O)N", "Carboxamida (urea)", "violeta"), ("C=C", "Doble enlace 10,11: CYP3A4 lo epoxida (metabolito activo)", "rosa")]),
    "oxcarbazepina": ("C1C2=CC=CC=C2N(C3=CC=CC=C3C1=O)C(=O)N", "C15H12N2O2",
                      [("C(=O)C", "10-ceto: evita el epóxido (menos interacciones)", "rosa"), ("NC(=O)N", "Carboxamida", "violeta")]),
    "lamotrigina": ("C1=CC(=C(C(=C1)Cl)Cl)C2=C(N=C(N=N2)N)N", "C9H7Cl2N5",
                    [("c1nncnc1", "Feniltriazina", "violeta"), ("Clc", "2,3-diclorofenilo", "verde")]),
    "lacosamida": ("CC(=O)N[C@H](COC)C(=O)NCC1=CC=CC=C1", "C13H18N2O3",
                   [("CC(=O)N", "Aminoácido funcionalizado (D-serina)", "violeta"), ("NCc1ccccc1", "Bencilamida", "naranja")]),
    "valproato": ("CCCC(CCC)C(=O)O", "C8H16O2",
                  [("C(=O)[OX2H]", "Ácido carboxílico (pKa 4,8): circula ionizado como valproato", "rojo"), ("CCCC(CCC)", "Ácido graso ramificado de 8 C", "verde")]),
    "etosuximida": ("CCC1(CC(=O)NC1=O)C", "C7H11NO2",
                    [("O=C1CCC(=O)N1", "Succinimida", "azul")]),
    "levetiracetam": ("CC[C@@H](C(=O)N)N1CCCC1=O", "C8H14N2O2",
                      [("O=C1CCCN1", "Pirrolidona (racetam)", "azul"), ("C(=O)[NH2]", "Amida", "violeta")]),
    "topiramato": ("CC1(O[C@@H]2CO[C@@]3([C@H]([C@@H]2O1)OC(O3)(C)C)COS(=O)(=O)N)C", "C12H21NO8S",
                   [("OS(=O)(=O)[NH2]", "Sulfamato: también inhibe la anhidrasa carbónica", "amarillo"), ("OCO", "Monosacárido protegido (fructopiranosa)", "violeta")]),
    "vigabatrina": ("C=CC(CCC(=O)O)N", "C6H11NO2",
                    [("NC(C=C)", "γ-vinilo: inhibidor «suicida» irreversible de la GABA-transaminasa", "rosa"), ("NCCCC(=O)[OX2H]", "Esqueleto de GABA", "azul")]),
    "tiagabina": ("CC1=C(SC=C1)C(=CCCN2CCC[C@H](C2)C(=O)O)C3=C(C=CS3)C", "C20H25NO2S2",
                  [("OC(=O)C1CCCNC1", "Ácido nipecótico: análogo de GABA que reconoce GAT-1", "azul"), ("c1ccsc1", "Tiofenos lipófilos: cruzan la BHE", "amarillo")]),
    "perampanel": ("C1=CC=C(C=C1)N2C=C(C=C(C2=O)C3=CC=CC=C3C#N)C4=CC=CC=N4", "C23H15N3O",
                   [("O=c1cccc[n]1", "Piridona central", "violeta"), ("C#N", "Nitrilo", "verde")]),
    # --- Antipsicóticos ---
    "haloperidol": ("C1CN(CCC1(C2=CC=C(C=C2)Cl)O)CCCC(=O)C3=CC=C(C=C3)F", "C21H23ClFNO2",
                    [("O=C(CCCN)c1ccc(F)cc1", "4-fluorobutirofenona: farmacóforo D2 de alta potencia", "rosa"), ("C1CNCCC1", "Piperidina (amina básica)", "azul")]),
    "clorpromazina": ("CN(C)CCCN1C2=CC=CC=C2SC3=C1C=C(C=C3)Cl", "C17H19ClN2S",
                      [("c1ccc2c(c1)Sc1ccccc1N2", "Fenotiazina tricíclica", "amarillo"), ("Clc", "2-cloro: aumenta la potencia", "verde"), ("NCCCN", "Cadena de 3 carbonos entre los N (óptima)", "azul")]),
    "risperidona": ("CC1=C(C(=O)N2CCCCC2=N1)CCN3CCC(CC3)C4=NOC5=C4C=CC(=C5)F", "C23H27FN4O2",
                    [("c1noc2ccccc12", "Benzisoxazol (bloqueo 5-HT2A potente)", "violeta"), ("C1CNCCC1", "Piperidina", "azul")]),
    "olanzapina": ("CC1=CC2=C(S1)NC3=CC=CC=C3N=C2N4CCN(CC4)C", "C17H20N4S",
                   [("c1ccsc1", "Tieno", "amarillo"), ("C1CNCCN1", "Metilpiperazina", "azul")]),
    "quetiapina": ("C1CN(CCN1CCOCCO)C2=NC3=CC=CC=C3SC4=CC=CC=C42", "C21H25N3O2S",
                   [("c1ccc2c(c1)Sc1ccccc1N=C2", "Dibenzotiazepina", "amarillo"), ("OCCOCC", "Cadena hidroxietoxietilo", "violeta")]),
    "clozapina": ("CN1CCN(CC1)C2=NC3=C(C=CC(=C3)Cl)NC4=CC=CC=C42", "C18H19ClN4",
                  [("c1ccc2c(c1)Nc1ccccc1N=C2", "Dibenzodiazepina", "naranja"), ("C1CNCCN1", "Metilpiperazina", "azul")]),
    "aripiprazol": ("C1CC(=O)NC2=C1C=CC(=C2)OCCCCN3CCN(CC3)C4=C(C(=CC=C4)Cl)Cl", "C23H27Cl2N3O2",
                    [("Clc1cccc(N2CCNCC2)c1Cl", "2,3-diclorofenilpiperazina", "verde"), ("O=C1CCc2ccccc2N1", "Dihidroquinolinona", "violeta")]),
}


def formula(m):
    f = rdMolDescriptors.CalcMolFormula(m)
    return f


def conformacion(m, semilla=7):
    mh = Chem.AddHs(m)
    p = AllChem.ETKDGv3()
    p.randomSeed = semilla
    n = 1 if mh.GetNumAtoms() <= 4 else 10
    ids = list(AllChem.EmbedMultipleConfs(mh, numConfs=n, params=p))
    if not ids:
        p.useRandomCoords = True
        ids = list(AllChem.EmbedMultipleConfs(mh, numConfs=n, params=p))
    if AllChem.MMFFHasAllMoleculeParams(mh):
        res = AllChem.MMFFOptimizeMoleculeConfs(mh, mmffVariant="MMFF94s", maxIters=4000)
    else:
        res = AllChem.UFFOptimizeMoleculeConfs(mh, maxIters=4000)
    energias = [e for (_, e) in res]
    mejor = ids[int(np.argmin(energias))]
    xyz = np.array(mh.GetConformer(mejor).GetPositions())
    pesado = np.array([a.GetAtomicNum() > 1 for a in mh.GetAtoms()])
    xyz -= xyz[pesado].mean(axis=0)
    if pesado.sum() >= 3:
        _, _, vt = np.linalg.svd(xyz[pesado], full_matrices=False)
        xyz = xyz @ vt.T
    return mh, xyz


PALETA = {6: (0.88, 0.91, 0.95), 7: (0.50, 0.70, 1.0), 8: (1.0, 0.48, 0.48), 16: (1.0, 0.85, 0.42),
          17: (0.50, 0.88, 0.54), 9: (0.62, 0.91, 0.75), 35: (0.85, 0.63, 0.42), 1: (0.75, 0.78, 0.82)}


def svg2d(m, grupos):
    d = rdMolDraw2D.MolDraw2DSVG(360, 250, -1, -1, True)  # texto como <text>, no trazos
    o = d.drawOptions()
    o.clearBackground = False
    o.padding = 0.06
    o.bondLineWidth = 2
    o.minFontSize = 13
    o.maxFontSize = 18
    o.annotationFontScale = 0.7
    o.updateAtomPalette(PALETA)
    o.setHighlightColour((1, 1, 1, 0.3))
    o.highlightRadius = 0.42
    o.fillHighlights = True
    o.continuousHighlight = True
    atomos, enlaces = {}, {}
    radios = {}
    for g in grupos:
        rgba = (*C[g["color"]], 0.38)
        for i in g["atomos"]:
            atomos.setdefault(i, [])
            atomos[i].append(rgba)
            radios[i] = 0.42
        for b in m.GetBonds():
            a, c = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
            if a in g["atomos"] and c in g["atomos"]:
                enlaces.setdefault(b.GetIdx(), []).append(rgba)
    mc = rdMolDraw2D.PrepareMolForDrawing(m)
    if atomos:
        d.DrawMoleculeWithHighlights(mc, "", atomos, enlaces, radios, {})
    else:
        d.DrawMolecule(mc)
    d.FinishDrawing()
    svg = d.GetDrawingText()
    svg = re.sub(r"<\?xml[^>]*>\s*", "", svg)
    svg = re.sub(r"<!-- .*? -->\s*", "", svg)
    svg = svg.replace("xmlns:rdkit='http://www.rdkit.org/xml'", "")
    svg = re.sub(r"\s*class='[^']*'", "", svg)
    svg = re.sub(r"(\d+\.\d)\d+", r"\1", svg)
    for defecto in ("fill-rule:evenodd;", "stroke-linecap:butt;", "stroke-linejoin:miter;", "stroke-miterlimit:10;",
                    "stroke-opacity:1;", "fill-opacity:1;", "xml:space='preserve'", "baseProfile='full'",
                    "xmlns:xlink='http://www.w3.org/1999/xlink'", "version='1.1'"):
        svg = svg.replace(defecto, "")
    svg = re.sub(r"\s+", " ", svg)
    return svg.strip()


def main():
    salida = {}
    for id_, (smi, esperada, grupos_def) in MOLECULAS.items():
        m = Chem.MolFromSmiles(smi)
        assert m is not None, id_
        f = formula(m)
        if f != esperada:
            raise SystemExit(f"{id_}: fórmula {f} ≠ esperada {esperada}")
        Chem.AssignStereochemistry(m, cleanIt=True, force=True)
        grupos = []
        for smarts, etiqueta, color in grupos_def:
            patron = Chem.MolFromSmarts(smarts)
            assert patron is not None, (id_, smarts)
            coinc = m.GetSubstructMatches(patron)
            if not coinc:
                raise SystemExit(f"{id_}: el grupo «{etiqueta}» ({smarts}) no aparece")
            if smarts == AMINA:
                coinc = coinc[:1]
            idx = sorted({i for c in coinc for i in c})
            grupos.append({"etiqueta": etiqueta, "color": color, "atomos": idx})
        mh, xyz = conformacion(m)
        svg = svg2d(m, grupos)
        salida[id_] = {
            "smiles": smi,
            "formula": f,
            "masa": round(Descriptors.MolWt(m), 2),
            "clogp": round(Crippen.MolLogP(m), 2),
            "tpsa": round(rdMolDescriptors.CalcTPSA(m), 1),
            "hbd": Lipinski.NumHDonors(m),
            "hba": Lipinski.NumHAcceptors(m),
            "rotables": rdMolDescriptors.CalcNumRotatableBonds(m),
            "inchikey": Chem.MolToInchiKey(m),
            "grupos": [{k: g[k] for k in ("etiqueta", "color", "atomos")} for g in grupos],
            "atomos": [[a.GetSymbol(), *[round(float(c), 2) for c in xyz[i]]] for i, a in enumerate(mh.GetAtoms())],
            "enlaces": [[b.GetBeginAtomIdx(), b.GetEndAtomIdx(), 2 if b.GetBondType() == Chem.BondType.DOUBLE else 3 if b.GetBondType() == Chem.BondType.TRIPLE else 1.5 if b.GetIsAromatic() else 1] for b in mh.GetBonds()],
            "svg": svg,
        }
        print(f"{id_:16s} {f:16s} M={salida[id_]['masa']:7.2f} cLogP={salida[id_]['clogp']:5.2f}  grupos={len(grupos)}")
    datos = json.dumps(salida, ensure_ascii=False, separators=(",", ":")).encode()
    (RAIZ / "src/datos/moleculas.json.gz").write_bytes(gzip.compress(datos, compresslevel=9, mtime=0))
    print(f"src/datos/moleculas.json.gz: {len(datos)/1e3:.0f} kB → {(RAIZ / 'src/datos/moleculas.json.gz').stat().st_size/1e3:.0f} kB")
    print(len(salida), "moléculas")


if __name__ == "__main__":
    main()
