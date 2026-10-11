// Código de color único en toda la app: el mismo neurotransmisor tiene el
// mismo color en el cerebro 3D, la sinapsis, las gráficas y los textos.
export const NT = {
  GABA: { nombre: 'GABA', largo: 'Ácido γ-aminobutírico', color: '#4DA3FF', tipo: 'inhibidor', resumen: 'Principal neurotransmisor inhibidor del cerebro. Abre canales de Cl⁻ (GABA-A) o activa GIRK (GABA-B).' },
  GLU: { nombre: 'Glutamato', largo: 'Glutamato', color: '#FF8F3D', tipo: 'excitador', resumen: 'Principal neurotransmisor excitador. Actúa en receptores AMPA, NMDA y kainato (canales de Na⁺/Ca²⁺) y metabotrópicos.' },
  DA: { nombre: 'Dopamina', largo: 'Dopamina', color: '#FF5CA8', tipo: 'modulador', resumen: 'Catecolamina de la recompensa, el movimiento y la prolactina. Receptores D1 (Gs) y D2 (Gi/o).' },
  '5HT': { nombre: 'Serotonina', largo: '5-hidroxitriptamina (5-HT)', color: '#A47BFF', tipo: 'modulador', resumen: 'Ánimo, ansiedad, sueño y dolor. Más de 14 receptores (5-HT1A inhibidor, 5-HT2A excitador, 5-HT3 canal iónico).' },
  NA: { nombre: 'Noradrenalina', largo: 'Noradrenalina (norepinefrina)', color: '#FFD24D', tipo: 'modulador', resumen: 'Alerta y vigilia desde el locus coeruleus. Receptores α1, α2 (Gi, inhibe su propia liberación) y β.' },
  ACH: { nombre: 'Acetilcolina', largo: 'Acetilcolina', color: '#3FD69B', tipo: 'modulador', resumen: 'Atención, memoria y placa motora. Receptores nicotínicos (canal iónico) y muscarínicos (GPCR).' },
  HIS: { nombre: 'Histamina', largo: 'Histamina', color: '#FF6B5E', tipo: 'modulador', resumen: 'Vigilia desde el núcleo tuberomamilar. El bloqueo H1 central produce somnolencia.' },
  ORX: { nombre: 'Orexina', largo: 'Orexina (hipocretina)', color: '#B6E35A', tipo: 'modulador', resumen: 'Péptido del hipotálamo lateral que estabiliza la vigilia (receptores OX1R/OX2R, Gq).' },
  OP: { nombre: 'Opioides endógenos', largo: 'Encefalinas, endorfinas y dinorfinas', color: '#3DD6D0', tipo: 'inhibidor', resumen: 'Péptidos que activan receptores μ, δ y κ (Gi/o): frenan la liberación y la excitabilidad neuronal.' },
  MT: { nombre: 'Melatonina', largo: 'Melatonina', color: '#8C9EFF', tipo: 'modulador', resumen: 'Hormona de la glándula pineal; señal de «noche» al reloj biológico (MT1/MT2, Gi).' },
  SP: { nombre: 'Sustancia P', largo: 'Sustancia P', color: '#FFB070', tipo: 'excitador', resumen: 'Neuropéptido de la fibra C nociceptiva (receptor NK1).' },
  PG: { nombre: 'Prostaglandinas', largo: 'Prostaglandina E₂', color: '#FF9E80', tipo: 'mediador', resumen: 'Mediadores de la inflamación que sensibilizan al nociceptor (receptores EP). Las sintetiza la COX.' },
  NAV: { nombre: 'Canal de Na⁺', largo: 'Canal de sodio dependiente de voltaje', color: '#FFB547', tipo: 'canal', resumen: 'Genera la fase de subida del potencial de acción.' },
};

export const IONES = {
  Na: { etiqueta: 'Na⁺', color: '#FFB547', carga: '+' },
  K: { etiqueta: 'K⁺', color: '#C38BFF', carga: '+' },
  Cl: { etiqueta: 'Cl⁻', color: '#55E0B8', carga: '−' },
  Ca: { etiqueta: 'Ca²⁺', color: '#FF6F91', carga: '2+' },
  Mg: { etiqueta: 'Mg²⁺', color: '#C9D1DC', carga: '2+' },
};

export const COLOR_FARMACO = '#FFFFFF';
export const COLOR_FARMACO_HALO = '#FFE7A3';
