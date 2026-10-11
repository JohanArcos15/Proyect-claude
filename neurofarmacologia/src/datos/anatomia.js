// Anatomía usada por el cerebro 3D. Coordenadas en mm, espacio MNI
// (x: derecha, y: anterior, z: superior). Las mallas de corteza y de las
// estructuras profundas son reales (fsaverage + Harvard-Oxford); los núcleos
// pequeños del tronco y del hipotálamo no aparecen en esos atlas y se marcan
// en posiciones aproximadas tomadas de atlas de RM y de la literatura
// (Keren 2009 para el locus coeruleus; Linnman 2012 para la SGPA, etc.).

// Parcelación Desikan-Killiany (índices del atlas de FreeSurfer)
export const DESIKAN = [
  ['unknown', 'Pared medial', 'medial'],
  ['bankssts', 'Banco del surco temporal superior', 'temporal'],
  ['caudalanteriorcingulate', 'Cíngulo anterior (caudal)', 'cinguloAnterior'],
  ['caudalmiddlefrontal', 'Giro frontal medio (caudal)', 'prefrontal'],
  ['corpuscallosum', 'Cuerpo calloso', 'medial'],
  ['cuneus', 'Cúneo', 'occipital'],
  ['entorhinal', 'Corteza entorrinal', 'temporalMedial'],
  ['fusiform', 'Giro fusiforme', 'temporal'],
  ['inferiorparietal', 'Lobulillo parietal inferior', 'parietal'],
  ['inferiortemporal', 'Giro temporal inferior', 'temporal'],
  ['isthmuscingulate', 'Istmo del cíngulo', 'cinguloPosterior'],
  ['lateraloccipital', 'Corteza occipital lateral', 'occipital'],
  ['lateralorbitofrontal', 'Corteza orbitofrontal lateral', 'prefrontal'],
  ['lingual', 'Giro lingual', 'occipital'],
  ['medialorbitofrontal', 'Corteza orbitofrontal medial', 'prefrontal'],
  ['middletemporal', 'Giro temporal medio', 'temporal'],
  ['parahippocampal', 'Giro parahipocampal', 'temporalMedial'],
  ['paracentral', 'Lobulillo paracentral', 'motora'],
  ['parsopercularis', 'Pars opercularis (área de Broca)', 'prefrontal'],
  ['parsorbitalis', 'Pars orbitalis', 'prefrontal'],
  ['parstriangularis', 'Pars triangularis (área de Broca)', 'prefrontal'],
  ['pericalcarine', 'Corteza visual primaria (V1)', 'occipital'],
  ['postcentral', 'Corteza somatosensitiva primaria (S1)', 'somatosensitiva'],
  ['posteriorcingulate', 'Cíngulo posterior', 'cinguloPosterior'],
  ['precentral', 'Corteza motora primaria (M1)', 'motora'],
  ['precuneus', 'Precúneo', 'parietal'],
  ['rostralanteriorcingulate', 'Cíngulo anterior (rostral)', 'cinguloAnterior'],
  ['rostralmiddlefrontal', 'Corteza prefrontal dorsolateral', 'prefrontal'],
  ['superiorfrontal', 'Giro frontal superior', 'prefrontal'],
  ['superiorparietal', 'Lobulillo parietal superior', 'parietal'],
  ['superiortemporal', 'Giro temporal superior', 'temporal'],
  ['supramarginal', 'Giro supramarginal', 'parietal'],
  ['frontalpole', 'Polo frontal', 'prefrontal'],
  ['temporalpole', 'Polo temporal', 'temporal'],
  ['transversetemporal', 'Corteza auditiva primaria', 'temporal'],
  ['insula', 'Ínsula', 'insula'],
];

// Zonas funcionales de la corteza (índice → textura de actividad)
export const ZONAS = [
  'medial', 'prefrontal', 'motora', 'somatosensitiva', 'parietal', 'temporal',
  'temporalMedial', 'occipital', 'cinguloAnterior', 'cinguloPosterior', 'insula',
];

export const NOMBRE_ZONA = {
  medial: 'Pared medial',
  prefrontal: 'Corteza prefrontal',
  motora: 'Corteza motora',
  somatosensitiva: 'Corteza somatosensitiva',
  parietal: 'Corteza parietal',
  temporal: 'Lóbulo temporal',
  temporalMedial: 'Lóbulo temporal medial',
  occipital: 'Lóbulo occipital',
  cinguloAnterior: 'Cíngulo anterior',
  cinguloPosterior: 'Cíngulo posterior',
  insula: 'Ínsula',
};

// Estructuras con malla real (Harvard-Oxford) o procedural
export const ESTRUCTURAS = {
  talamo: { nombre: 'Tálamo', color: '#7FA7D9', funcion: 'Estación de relevo sensitivo hacia la corteza; con la corteza genera los ritmos del sueño, la conciencia y las crisis de ausencia.' },
  caudado: { nombre: 'Núcleo caudado', color: '#8FB8A8', funcion: 'Parte del cuerpo estriado. Recibe dopamina de la sustancia negra (vía nigroestriada): control motor y hábitos.' },
  putamen: { nombre: 'Putamen', color: '#9CC2A0', funcion: 'Cuerpo estriado motor. El bloqueo D2 aquí causa síntomas extrapiramidales.' },
  palido: { nombre: 'Globo pálido', color: '#A9B7C9', funcion: 'Salida de los ganglios basales (GABA).' },
  hipocampo: { nombre: 'Hipocampo', color: '#D9A86C', funcion: 'Memoria. Rico en receptores GABA-A α5 (amnesia por benzodiacepinas) y foco frecuente de la epilepsia del lóbulo temporal.' },
  amigdala: { nombre: 'Amígdala', color: '#E07A7A', funcion: 'Miedo y ansiedad. Diana de los ansiolíticos (GABA-A α2, 5-HT).' },
  accumbens: { nombre: 'Núcleo accumbens', color: '#E58AC0', funcion: 'Recompensa y saliencia. Destino de la vía dopaminérgica mesolímbica.' },
  ventriculo: { nombre: 'Ventrículo lateral', color: '#5C7A99', funcion: 'Cavidad con líquido cefalorraquídeo.' },
  tronco: { nombre: 'Tronco encefálico', color: '#B39DDB', funcion: 'Mesencéfalo, protuberancia y bulbo: centros de la respiración, del despertar y de la modulación del dolor.' },
  cerebelo: { nombre: 'Cerebelo', color: '#C9A6D9', funcion: 'Coordinación motora. Muy rico en receptores GABA-A α6; la ataxia es signo de toxicidad de muchos depresores.' },
  medula: { nombre: 'Médula espinal', color: '#C7B8E8', funcion: 'Asta dorsal: primera sinapsis del dolor (diana espinal de los opioides). Asta ventral: motoneuronas.' },
  hipotalamo: { nombre: 'Hipotálamo', color: '#E8B86B', funcion: 'Sueño-vigilia (VLPO, orexina, histamina), temperatura y control de la hipófisis.' },
  hipofisis: { nombre: 'Hipófisis', color: '#F0A35E', funcion: 'La dopamina hipotalámica inhibe la prolactina; los antagonistas D2 la elevan.' },
  nervio: { nombre: 'Nervio periférico', color: '#F2D07A', funcion: 'Axones sensitivos y motores. Aquí actúan los anestésicos locales.' },
};

// Núcleos pequeños: marcadores. bilateral → se dibuja en ±x
export const NUCLEOS = {
  lc: { nombre: 'Locus coeruleus', nt: 'NA', pos: [6, -37, -26], bilateral: true, funcion: 'Principal fuente de noradrenalina del cerebro: vigilia y alerta. Diana de la dexmedetomidina (α2).' },
  atv: { nombre: 'Área tegmental ventral', nt: 'DA', pos: [4, -16, -12], bilateral: true, funcion: 'Origen de las vías dopaminérgicas mesolímbica y mesocortical.' },
  snc: { nombre: 'Sustancia negra compacta', nt: 'DA', pos: [11, -18, -12], bilateral: true, funcion: 'Origen de la vía nigroestriada (movimiento).' },
  sgpa: { nombre: 'Sustancia gris periacueductal', nt: 'OP', pos: [0, -31, -9], bilateral: false, funcion: 'Centro de la analgesia descendente. Los opioides la desinhiben.' },
  rafe: { nombre: 'Núcleo dorsal del rafe', nt: '5HT', pos: [0, -29, -17], bilateral: false, funcion: 'Fuente de serotonina hacia el prosencéfalo: ánimo, ansiedad, sueño.' },
  bvm: { nombre: 'Bulbo rostral ventromedial', nt: '5HT', pos: [0, -38, -45], bilateral: false, funcion: 'Relevo de la vía descendente del dolor hacia la médula (rafe magno).' },
  prebotz: { nombre: 'Complejo pre-Bötzinger', nt: 'GLU', pos: [6, -43, -53], bilateral: true, funcion: 'Generador del ritmo respiratorio. Los receptores μ aquí explican la depresión respiratoria por opioides.' },
  areaPostrema: { nombre: 'Área postrema (ZQG)', nt: 'DA', pos: [0, -46, -44], bilateral: false, funcion: 'Zona quimiorreceptora del vómito (D2, 5-HT3, μ). Opioides: náuseas; droperidol: antiemético.' },
  ntm: { nombre: 'Núcleo tuberomamilar', nt: 'HIS', pos: [6, -10, -13], bilateral: true, funcion: 'Única fuente de histamina cerebral: vigilia. Los antihistamínicos H1 dan sueño.' },
  vlpo: { nombre: 'Núcleo preóptico ventrolateral', nt: 'GABA', pos: [6, 6, -10], bilateral: true, funcion: 'El «interruptor del sueño»: sus neuronas GABA apagan los núcleos del despertar.' },
  hl: { nombre: 'Hipotálamo lateral (orexina)', nt: 'ORX', pos: [8, -6, -9], bilateral: true, funcion: 'Neuronas de orexina que estabilizan la vigilia. Diana del suvorexant.' },
  nsq: { nombre: 'Núcleo supraquiasmático', nt: 'MT', pos: [2, 2, -14], bilateral: true, funcion: 'Reloj biológico; receptores MT1/MT2 de melatonina (ramelteón).' },
  arcuato: { nombre: 'Núcleo arcuato', nt: 'DA', pos: [2, -5, -15], bilateral: true, funcion: 'Origen de la vía tuberoinfundibular (dopamina → hipófisis).' },
  basalis: { nombre: 'Núcleo basal de Meynert', nt: 'ACH', pos: [18, 0, -8], bilateral: true, funcion: 'Acetilcolina hacia la corteza: atención y memoria.' },
  ppt: { nombre: 'Núcleo pedunculopontino', nt: 'ACH', pos: [8, -31, -19], bilateral: true, funcion: 'Acetilcolina hacia el tálamo: despertar y sueño REM.' },
  astaDorsal: { nombre: 'Asta dorsal medular', nt: 'GLU', pos: [3, -52, -112], bilateral: true, funcion: 'Primera sinapsis del dolor: la fibra C libera glutamato y sustancia P. Receptores μ pre y postsinápticos.' },
  astaVentral: { nombre: 'Asta ventral medular', nt: 'ACH', pos: [4, -44, -112], bilateral: true, funcion: 'Motoneuronas. Los anestésicos inhalados actúan aquí para producir inmovilidad.' },
  foco: { nombre: 'Foco epileptógeno (hipocampo)', nt: 'GLU', pos: [-28, -22, -14], bilateral: false, funcion: 'Origen de una crisis focal del lóbulo temporal.' },
  bloqueo: { nombre: 'Sitio del bloqueo', nt: 'NAV', pos: [52, -48, -150], bilateral: false, funcion: 'El anestésico local se deposita alrededor del nervio y bloquea los canales de Na⁺.' },
};

// Vías: puntos de paso MNI. nt define el color. bilateral → espejo en ±x.
export const VIAS = {
  daMesolimbica: {
    nombre: 'Vía mesolímbica', nt: 'DA', bilateral: true,
    funcion: 'ATV → núcleo accumbens. Su hiperactividad se asocia a los síntomas positivos de la psicosis.',
    ramas: [
      [[4, -16, -12], [6, -8, -11], [8, 2, -10], [10, 12, -8]],
      [[4, -16, -12], [12, -10, -14], [18, -6, -17], [22, -4, -18]],
    ],
  },
  daMesocortical: {
    nombre: 'Vía mesocortical', nt: 'DA', bilateral: true,
    funcion: 'ATV → corteza prefrontal. Su hipofunción se asocia a síntomas negativos y cognitivos.',
    ramas: [[[4, -16, -12], [6, -6, -10], [7, 8, -8], [8, 24, -4], [10, 38, 6], [22, 44, 22], [30, 40, 30]],
      [[8, 24, -4], [6, 34, 14], [6, 30, 26]]],
  },
  daNigroestriada: {
    nombre: 'Vía nigroestriada', nt: 'DA', bilateral: true,
    funcion: 'Sustancia negra → caudado y putamen. Su bloqueo produce síntomas extrapiramidales.',
    ramas: [[[11, -18, -12], [14, -10, -4], [17, -2, 4], [14, 10, 10]], [[17, -2, 4], [24, 2, 2]]],
  },
  daTuberoinfundibular: {
    nombre: 'Vía tuberoinfundibular', nt: 'DA', bilateral: true,
    funcion: 'Núcleo arcuato → hipófisis. La dopamina inhibe la prolactina; su bloqueo causa hiperprolactinemia.',
    ramas: [[[2, -5, -15], [1, -3, -21], [0.5, 0, -27], [0, 2, -31]]],
  },
  naCoeruleus: {
    nombre: 'Proyecciones del locus coeruleus', nt: 'NA', bilateral: true,
    funcion: 'Noradrenalina hacia toda la corteza, tálamo, amígdala y médula: alerta y vigilancia.',
    ramas: [
      [[6, -37, -26], [7, -28, -12], [8, -16, -2], [10, 0, 6], [14, 18, 18], [22, 36, 32], [30, 30, 46]],
      [[8, -16, -2], [12, -20, 6]],
      [[7, -28, -12], [16, -12, -14], [22, -5, -18]],
      [[14, 18, 18], [10, -10, 40], [24, -50, 50]],
      [[6, -37, -26], [5, -42, -50], [4, -46, -80], [3, -50, -110]],
    ],
  },
  ht5Rafe: {
    nombre: 'Proyecciones serotoninérgicas del rafe', nt: '5HT', bilateral: true,
    funcion: 'Serotonina hacia corteza, amígdala e hipocampo; y hacia la médula (control del dolor).',
    ramas: [
      [[0, -29, -17], [4, -20, -10], [8, -4, -6], [10, 14, 4], [16, 34, 20], [26, 46, 18]],
      [[8, -4, -6], [18, -6, -16], [22, -4, -18]],
      [[4, -20, -10], [18, -18, -10], [28, -22, -12]],
    ],
  },
  hisTuberomamilar: {
    nombre: 'Proyecciones histaminérgicas', nt: 'HIS', bilateral: true,
    funcion: 'Histamina desde el núcleo tuberomamilar hacia toda la corteza: mantiene la vigilia.',
    ramas: [[[6, -10, -13], [8, -2, -4], [10, 12, 8], [18, 32, 26], [30, 24, 44]], [[8, -2, -4], [10, -16, 6]], [[10, 12, 8], [14, -20, 46], [30, -60, 40]]],
  },
  orxHipotalamo: {
    nombre: 'Proyecciones de orexina', nt: 'ORX', bilateral: true,
    funcion: 'Las neuronas de orexina excitan los núcleos del despertar (LC, rafe, histamina) y la corteza.',
    ramas: [
      [[8, -6, -9], [7, -9, -12], [6, -10, -13]],
      [[8, -6, -9], [6, -20, -14], [5, -29, -17], [6, -37, -26]],
      [[8, -6, -9], [10, 6, 2], [16, 26, 22], [26, 30, 40]],
    ],
  },
  gabaVlpo: {
    nombre: 'Vía inhibidora del sueño (VLPO)', nt: 'GABA', bilateral: true,
    funcion: 'Las neuronas GABA del VLPO inhiben los núcleos del despertar: así se inicia el sueño.',
    ramas: [[[6, 6, -10], [6, -2, -12], [6, -10, -13]], [[6, -2, -12], [5, -16, -14], [3, -29, -17]], [[5, -16, -14], [6, -30, -20], [6, -37, -26]], [[6, -2, -12], [8, -6, -9]]],
  },
  achBasal: {
    nombre: 'Proyecciones colinérgicas', nt: 'ACH', bilateral: true,
    funcion: 'Acetilcolina del núcleo basal hacia la corteza y del pedunculopontino hacia el tálamo.',
    ramas: [[[18, 0, -8], [22, 12, 6], [30, 30, 30]], [[18, 0, -8], [26, -14, 20], [40, -40, 40]], [[8, -31, -19], [10, -24, -4], [12, -18, 6]]],
  },
  gluTalamocortical: {
    nombre: 'Circuito tálamo-cortical', nt: 'GLU', bilateral: true,
    funcion: 'El tálamo y la corteza se excitan en bucle. Los anestésicos y el sueño lo sincronizan; en las ausencias oscila a 3 Hz.',
    ramas: [
      [[12, -18, 6], [20, -18, 24], [32, -24, 46], [40, -26, 56]],
      [[12, -14, 8], [18, 4, 20], [28, 26, 34], [32, 40, 26]],
      [[12, -24, 4], [22, -40, 18], [30, -62, 30]],
      [[12, -18, 6], [24, -10, 10], [38, -6, 4]],
    ],
  },
  dolorAscendente: {
    nombre: 'Vía ascendente del dolor (espinotalámica)', nt: 'GLU', bilateral: false,
    funcion: 'Nociceptor → asta dorsal → cruza la médula → tálamo → corteza somatosensitiva, cíngulo e ínsula.',
    ramas: [
      [[52, -48, -150], [30, -50, -128], [8, -52, -114], [3, -52, -112], [-3, -48, -104], [-5, -46, -80], [-7, -40, -54], [-9, -32, -30], [-11, -24, -8], [-15, -21, 2], [-26, -22, 26], [-38, -26, 50], [-42, -28, 56]],
      [[-15, -21, 2], [-8, 0, 20], [-6, 24, 28]],
      [[-15, -21, 2], [-28, -10, 6], [-38, 2, 4]],
    ],
  },
  dolorDescendente: {
    nombre: 'Vía descendente analgésica', nt: 'OP', bilateral: false,
    funcion: 'SGPA → bulbo rostral ventromedial → asta dorsal. Libera encefalinas, serotonina y noradrenalina que frenan el dolor.',
    ramas: [[[0, -31, -9], [0, -34, -26], [0, -38, -45], [1, -44, -70], [2, -48, -95], [3, -52, -112]]],
  },
};

// Médula espinal y nervio periférico (procedurales)
export const MEDULA = [[0, -38, -58], [0, -42, -75], [0, -46, -95], [0, -50, -120], [0, -53, -145]];
export const NERVIO = [[3, -50, -114], [12, -50, -122], [28, -50, -132], [44, -48, -144], [58, -48, -156], [70, -46, -172]];

export const ESPACIO_NOTA = 'Mallas reales (FreeSurfer fsaverage, atlas Harvard-Oxford). Los núcleos pequeños y las vías son trazados esquemáticos en posiciones aproximadas.';
