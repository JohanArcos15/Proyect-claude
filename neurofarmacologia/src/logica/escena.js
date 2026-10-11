// Traduce «categoría + fármaco + dosis + opciones» en la configuración de
// cada vista: cerebro 3D, sinapsis, neurona, EEG y monitor.
import { CLASES, DIANAS, estadoClinico } from '../datos/clases.js';
import { NT, COLOR_FARMACO_HALO } from '../datos/neurotransmisores.js';
import { mezcla } from '../util/dibujo.js';
import { eegDesde } from '../vistas/monitor.js';

const CALIDO = '#ffb27a';
const FRIO = '#4DA3FF';
const lim = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

export const ACIDOS = new Set(['ibuprofeno', 'naproxeno', 'diclofenaco', 'aspirina', 'celecoxib', 'paracetamol', 'acetilcisteina', 'gabapentina', 'pregabalina', 'propofol', 'tiopental', 'metohexital', 'fenobarbital', 'pentobarbital', 'secobarbital', 'fenitoina', 'valproato', 'etosuximida']);

// Estado clínico: efectos 0..1. Sin fármaco aplicado, todo en 0.
export function estado(farmaco, aplicado, dosis) {
  if (!farmaco || !aplicado) return { ocupacion: 0 };
  return estadoClinico(farmaco, CLASES[farmaco.clase], dosis);
}

function profundidad(e) {
  return lim(Math.max((e.sedacion || 0) * 0.5, (e.hipnosis || 0) * 0.82, e.anestesia || 0));
}

function zonasProfundidad(p, base = 0.42) {
  return { todas: [mezcla(CALIDO, FRIO, lim(p * 1.15)), base * (1 - 0.35 * p)] };
}

export function nivelCrisis(farmaco, e, tipo) {
  if (!tipo) return 0;
  const espectro = farmaco?.espectro?.[tipo] ?? (farmaco && ['bzd', 'barbiturico', 'valproato', 'sv2a', 'topiramato'].includes(farmaco.clase) ? 1 : farmaco?.clase === 'etosuximida' ? (tipo === 'ausencia' ? 1 : 0) : 0.8);
  const eff = (e.anticonvulsivo || 0) * espectro;
  return lim(1 - eff, 0, 1.25);
}

// ---------------------------------------------------------------------------
export function configCerebro(cat, farmaco, e, opciones = {}) {
  const clase = farmaco ? CLASES[farmaco.clase] : null;
  const cid = farmaco?.clase;
  const aplicado = !!opciones.aplicado;
  const cfg = { vista: null, corteza: opciones.corteza || 'cristal', vias: {}, resaltar: [], nucleos: [], zonas: {}, actividad: 1, ritmo: 1, crisis: null, intensidad: {}, alertas: {} };
  const dianas = aplicado && clase && DIANAS[clase.dianas]?.length ? { ids: DIANAS[clase.dianas], color: COLOR_FARMACO_HALO, nivel: 0.35 + 0.65 * lim(e.ocupacion || 0) } : null;
  cfg.dianas = dianas;
  const p = profundidad(e);
  const escenario = cat.escenario;
  // depresión respiratoria y náuseas siempre visibles cuando aparecen
  const depResp = e.depResp || 0;
  if (depResp > 0.18) { cfg.nucleos.push('prebotz'); cfg.alertas.prebotz = lim((depResp - 0.18) * 1.6); }
  if ((e.nausea || 0) > 0.3) { cfg.nucleos.push('areaPostrema'); cfg.intensidad.areaPostrema = e.nausea; cfg.resaltar.push('areaPostrema'); }

  const anestesiaGeneral = () => {
    cfg.vista = 'general';
    cfg.zonas = zonasProfundidad(p);
    cfg.actividad = 1 - 0.8 * p;
    cfg.ritmo = 1 - 0.65 * p;
    cfg.vias = { gluTalamocortical: 0.9 - 0.3 * p, naCoeruleus: 0.8 * (1 - p), achBasal: 0.8 * (1 - p), hisTuberomamilar: 0.7 * (1 - p) };
    cfg.resaltar.push('talamo');
    cfg.nucleos.push('lc', 'ntm', 'basalis');
    if (cid === 'nmda') {
      // disociación: la corteza frontal sigue muy activa (gamma)
      cfg.zonas = { todas: [mezcla(CALIDO, FRIO, p * 0.6), 0.5], prefrontal: ['#ff9e5a', 0.7 + 0.5 * p], cinguloAnterior: ['#ff9e5a', 0.6 + 0.4 * p] };
      cfg.actividad = 1 - 0.25 * p;
      cfg.ritmo = 1 + 0.6 * p;
    }
    if (cid === 'inhalado' && (e.anestesia || 0) > 0.3) { cfg.resaltar.push('medula'); cfg.nucleos.push('astaVentral'); cfg.resaltar.push('astaVentral'); }
  };

  const dolor = () => {
    const opioide = cid === 'opioide';
    const local = cid === 'anestesicoLocal';
    const analg = local ? 0 : e.analgesia || 0;
    const nivelDolor = lim(1 - analg);
    cfg.vista = 'medula';
    cfg.vias = { dolorAscendente: 0.3 + 1.05 * nivelDolor, dolorDescendente: 0.25 + (opioide ? 1.2 * analg : 0.35 * analg) };
    cfg.zonas = { somatosensitivaL: ['#ff8f3d', 1.1 * nivelDolor], cinguloAnteriorL: ['#ff8f3d', 0.8 * nivelDolor], insulaL: ['#ff8f3d', 0.7 * nivelDolor] };
    if (local) {
      const b = e.bloqueoSens || 0;
      cfg.viasBloqueadas = { dolorAscendente: { u: 0.08, nivel: b } };
      cfg.zonas = { somatosensitivaL: ['#ff8f3d', 1.1 * (1 - b)], cinguloAnteriorL: ['#ff8f3d', 0.8 * (1 - b)], insulaL: ['#ff8f3d', 0.7 * (1 - b)] };
      cfg.resaltar.push('nervio');
      cfg.nucleos.push('bloqueo');
      if (aplicado) cfg.resaltar.push('bloqueo');
    }
    if (['aine', 'paracetamol', 'pirazolona'].includes(cid)) { cfg.resaltar.push('nervio', 'hipotalamo'); cfg.nucleos.push('bloqueo'); }
    cfg.resaltar.push('astaDorsal', 'talamo');
    cfg.nucleos.push('astaDorsal', 'sgpa', 'bvm');
    if (opioide && aplicado) cfg.resaltar.push('sgpa');
    cfg.actividad = 1 - 0.5 * (e.sedacion || 0);
  };

  switch (escenario) {
    case 'fundamentos':
      cfg.vista = 'general';
      cfg.vias = { gluTalamocortical: 0.8 };
      cfg.zonas = { todas: ['#7fb6ff', 0.5] };
      break;
    case 'dolor':
      if (cid === 'antagonistaOpioide') { dolor(); cfg.vias.dolorDescendente = 0.25; cfg.resaltar.push('sgpa'); }
      else if (cid === 'nmda') { dolor(); cfg.zonas.prefrontal = ['#ff9e5a', 0.4 * (e.sedacion || 0)]; }
      else if (cid === 'antidotoParacetamol') { cfg.vista = 'general'; cfg.dianas = null; }
      else dolor();
      break;
    case 'anestesia':
      if (cid === 'anestesicoLocal') dolor();
      else if (['bnmDespolarizante', 'bnmNoDespolarizante', 'ryr1'].includes(cid)) {
        cfg.vista = 'medula';
        cfg.resaltar.push('nervio', 'astaVentral', 'medula');
        cfg.nucleos.push('astaVentral');
        cfg.vias = { gluTalamocortical: 1, naCoeruleus: 0.8, achBasal: 0.8 };
        cfg.zonas = { todas: [CALIDO, 0.8] };
        if (opciones.hipertermia) cfg.alertas.medula = 0.6;
      } else if (cid === 'tipico') {
        cfg.vista = 'tronco';
        cfg.nucleos.push('areaPostrema');
        cfg.resaltar.push('areaPostrema');
        cfg.zonas = zonasProfundidad(0.3 * (e.sedacion || 0));
      } else if (cid === 'opioide') { dolor(); cfg.vista = 'tronco'; }
      else anestesiaGeneral();
      break;
    case 'sedacion': {
      const s = e.sedacion || 0;
      if (cid === 'agonistaA2') {
        cfg.vista = 'hipotalamo';
        cfg.vias = { naCoeruleus: 1 - 0.85 * s, gabaVlpo: 0.2 + 0.9 * s, hisTuberomamilar: 0.9 - 0.5 * s };
        cfg.resaltar.push('lc', 'vlpo');
        cfg.intensidad.lc = 1 - 0.7 * s;
        cfg.nucleos.push('lc', 'vlpo', 'ntm');
        cfg.zonas = zonasProfundidad(0.7 * s);
        cfg.actividad = 1 - 0.55 * s;
      } else if (cid === 'nmda') anestesiaGeneral();
      else {
        cfg.vista = 'general';
        cfg.zonas = zonasProfundidad(p);
        cfg.actividad = 1 - 0.75 * p;
        cfg.ritmo = 1 - 0.55 * p;
        cfg.vias = { gluTalamocortical: 0.9 - 0.3 * p, naCoeruleus: 0.8 * (1 - 0.7 * p) };
        cfg.resaltar.push('talamo');
        if ((e.amnesia || 0) > 0.3) { cfg.resaltar.push('hipocampo'); cfg.intensidad.hipocampo = e.amnesia; }
      }
      break;
    }
    case 'sueno': {
      const sueno = lim(Math.max(e.hipnosis || 0, 0.75 * (e.sedacion || 0)));
      cfg.vista = 'hipotalamo';
      cfg.vias = { gabaVlpo: 0.15 + 1.1 * sueno, naCoeruleus: 1 - 0.8 * sueno, ht5Rafe: 1 - 0.75 * sueno, hisTuberomamilar: 1 - 0.8 * sueno, orxHipotalamo: 0.9 - 0.6 * sueno, achBasal: 0.9 - 0.7 * sueno };
      cfg.nucleos.push('vlpo', 'lc', 'rafe', 'ntm', 'hl', 'nsq', 'basalis');
      const occ = lim(e.ocupacion || 0);
      if (cid === 'dora') { cfg.viasBloqueadas = { orxHipotalamo: { u: 0.75, nivel: occ } }; cfg.resaltar.push('hl'); }
      else if (cid === 'antihistaminico') { cfg.viasBloqueadas = { hisTuberomamilar: { u: 0.8, nivel: occ } }; cfg.resaltar.push('ntm'); }
      else if (cid === 'agonistaMT') { cfg.resaltar.push('nsq'); cfg.intensidad.nsq = 0.6 + 0.6 * occ; }
      else cfg.resaltar.push('vlpo', 'talamo');
      cfg.zonas = zonasProfundidad(0.85 * sueno);
      cfg.actividad = 1 - 0.6 * sueno;
      cfg.ritmo = 1 - 0.5 * sueno;
      break;
    }
    case 'ansiedad': {
      const ans = lim(1 - (e.ansiolisis || 0));
      cfg.vista = 'profundo';
      cfg.resaltar.push('amigdala', 'hipocampo');
      cfg.intensidad.amigdala = 0.25 + 1.1 * ans;
      cfg.intensidad.hipocampo = 0.4;
      cfg.vias = { naCoeruleus: 0.3 + 1.0 * ans, ht5Rafe: 0.6 + (cid === 'isrs' || cid === 'azapirona' ? 0.8 * (e.ansiolisis || 0) : 0) };
      cfg.nucleos.push('lc', 'rafe');
      cfg.zonas = { cinguloAnterior: ['#ff8f3d', 0.75 * ans], insula: ['#ff8f3d', 0.6 * ans], prefrontal: [mezcla('#ff8f3d', FRIO, 1 - ans), 0.35] };
      cfg.actividad = 1 - 0.35 * (e.sedacion || 0);
      break;
    }
    case 'depresion':
      cfg.vista = depResp > 0.35 ? 'tronco' : 'general';
      cfg.zonas = zonasProfundidad(p);
      cfg.actividad = 1 - 0.85 * p;
      cfg.ritmo = 1 - 0.65 * p;
      cfg.vias = { gluTalamocortical: 0.9 - 0.4 * p, naCoeruleus: 0.8 * (1 - p) };
      cfg.resaltar.push('talamo');
      cfg.nucleos.push('prebotz');
      break;
    case 'epilepsia': {
      const tipo = opciones.crisis || 'tonicoClonica';
      const nivel = nivelCrisis(farmaco, e, tipo);
      const s = e.sedacion || 0;
      if (tipo === 'ausencia') {
        cfg.vista = 'talamo';
        cfg.crisis = { tipo: 'ausencia', extension: 1.2, intensidad: 0.75 * lim(nivel), frecuencia: 3, estructuras: ['talamo'] };
        cfg.vias = { gluTalamocortical: 0.5 + 1.0 * lim(nivel) };
        cfg.resaltar.push('talamo');
      } else {
        cfg.vista = 'temporal';
        cfg.crisis = { tipo: 'focal', extension: 0.08 + 0.95 * Math.pow(lim(nivel), 1.6), intensidad: 0.3 + 0.8 * lim(nivel), frecuencia: 7, estructuras: nivel > 0.5 ? ['hipocampo', 'amigdala', 'talamo'] : ['hipocampo'] };
        cfg.resaltar.push('hipocampo');
        cfg.nucleos.push('foco');
      }
      cfg.zonas = zonasProfundidad(0.5 * s, 0.3);
      cfg.actividad = 1 - 0.3 * s;
      break;
    }
    case 'psicosis': {
      const occ = e.ocupacionD2 || 0;
      const intr = clase?.intrinseca || 0;
      cfg.vista = 'medial';
      cfg.vias = { daMesolimbica: 1.6, daMesocortical: 0.45 + 0.4 * intr * occ, daNigroestriada: 1, daTuberoinfundibular: 0.9 };
      const b = occ * (1 - 0.6 * intr);
      cfg.viasBloqueadas = { daMesolimbica: { u: 0.82, nivel: b }, daNigroestriada: { u: 0.8, nivel: b }, daTuberoinfundibular: { u: 0.75, nivel: b }, daMesocortical: { u: 0.86, nivel: b * 0.7 } };
      cfg.resaltar.push('accumbens', 'caudado', 'putamen', 'hipofisis', 'atv', 'snc', 'arcuato');
      cfg.nucleos.push('atv', 'snc', 'arcuato', 'areaPostrema');
      cfg.intensidad.accumbens = 1.2 - 0.8 * (e.antipsicotico || 0);
      if ((e.sep || 0) > 0.15) { cfg.alertas.putamen = e.sep; cfg.alertas.caudado = e.sep; }
      if ((e.prolactina || 0) > 0.15) cfg.alertas.hipofisis = e.prolactina;
      cfg.zonas = { prefrontal: ['#ff5ca8', 0.25 + 0.3 * intr * occ] };
      if (e.sedacion) { cfg.actividad = 1 - 0.4 * e.sedacion; }
      break;
    }
    default:
      cfg.vista = 'general';
  }
  cfg.resaltar = [...new Set(cfg.resaltar)];
  cfg.nucleos = [...new Set(cfg.nucleos)];
  return cfg;
}

// ---------------------------------------------------------------------------
const GABAA = { tipo: 'canal', nombre: 'GABA-A', ion: 'Cl', subA: '#3d6fb8', subB: '#5a8fd6' };
const AMPA = { tipo: 'canal', nombre: 'AMPA', ion: 'Na', subA: '#a8622c', subB: '#c9783a', signo: 1 };
const NMDA = { tipo: 'canal', nombre: 'NMDA', ion: 'Ca', ion2: 'Na', mg: true, subA: '#9a5428', subB: '#c06a33', signo: 1 };
export const ESCENAS_FUNDAMENTOS = {
  base: { tipo: 'quimica', titulo: 'Sinapsis glutamatérgica', nt: 'GLU', post: [AMPA, NMDA] },
  gpcr: { tipo: 'quimica', titulo: 'GABA: receptor ionotrópico (GABA-A) y metabotrópico (GABA-B)', nt: 'GABA', pre: { transportador: 'GAT-1' }, post: [GABAA, { tipo: 'gpcr', nombre: 'GABA-B', g: 'Gi/o', efector: 'GIRK', color: '#5a8fd6' }] },
};

// Lista de escenas moleculares disponibles para un fármaco
export function escenasPara(farmaco, opciones = {}) {
  if (!farmaco) {
    const base = opciones.escenaFundamentos === 'gpcr' ? ESCENAS_FUNDAMENTOS.gpcr : ESCENAS_FUNDAMENTOS.base;
    return [{ titulo: 'Sinapsis', cfg: { ...base, pasos: !!opciones.pasos } }];
  }
  const clase = CLASES[farmaco.clase];
  const principal = { ...clase.sinapsis };
  if (farmaco.seleccion) principal.seleccion = farmaco.seleccion;
  if (farmaco.irreversible) principal.irreversible = true;
  if (principal.tipo === 'axon' && farmaco.pka) principal.pKa = farmaco.pka;
  const lista = [{ titulo: tituloEscena(principal), cfg: principal }];
  for (const x of clase.escenasExtra || []) lista.push({ titulo: x.titulo, cfg: { ...x.cfg, ...(x.cfg.tipo === 'axon' && farmaco.pka ? { pKa: farmaco.pka } : {}) }, dosis: x.dosis });
  return lista;
}

function tituloEscena(cfg) {
  if (cfg.tipo === 'axon') return cfg.canal === 'CavT' ? 'Canal T' : 'Canal de Na⁺';
  if (cfg.tipo === 'cox') return 'COX';
  if (cfg.tipo === 'placa') return 'Placa motora';
  if (cfg.tipo === 'hepatica') return 'Hígado';
  return 'Sinapsis';
}

// Configuración de la neurona (osciloscopio)
export function configNeurona(farmaco, e, opciones = {}) {
  if (!farmaco) return { protocolo: 'sinaptico', mod: {}, nombre: '', etiquetaFarmaco: 'Mismo circuito (sin fármaco)', nota: '' };
  const clase = CLASES[farmaco.clase];
  const n = clase.neurona || { protocolo: 'ninguno' };
  const occ = lim(e.ocupacion ?? 0.6);
  let protocolo = n.protocolo;
  let mod = typeof n.mod === 'function' ? n.mod(occ) : {};
  if (opciones.crisis === 'ausencia' && ['etosuximida', 'valproato'].includes(farmaco.clase)) {
    protocolo = 'talamico';
    mod = { tBloqueo: (farmaco.clase === 'etosuximida' ? 0.9 : 0.75) * occ };
  }
  return {
    protocolo, mod, modControl: n.modControl || {}, nombre: farmaco.nombre.split(' (')[0],
    etiquetaControl: n.etiquetaControl, etiquetaFarmaco: n.etiquetaFarmaco, nota: n.nota || '',
  };
}

// EEG + índice
export function configEEG(cat, farmaco, e, opciones = {}) {
  const clase = farmaco ? CLASES[farmaco.clase] : null;
  let crisis = null;
  if (cat.escenario === 'epilepsia') {
    const tipo = opciones.crisis || 'tonicoClonica';
    crisis = { tipo, nivel: lim(nivelCrisis(farmaco, e, tipo)) * 0.9 };
  }
  return eegDesde(e, clase?.eeg || 'neutro', crisis);
}

// Indicadores del monitor
export function indicadores(cat, farmaco, e, opciones = {}) {
  const lista = [];
  const p = profundidad(e);
  for (const id of cat.monitor || []) {
    if (id === 'conciencia') {
      const t = p < 0.12 ? 'Despierto' : p < 0.3 ? 'Sedación leve' : p < 0.5 ? 'Sedación moderada' : p < 0.68 ? (cat.escenario === 'sueno' ? 'Dormido' : 'Sedación profunda') : p < 0.93 ? (cat.escenario === 'sueno' ? 'Sueño profundo' : 'Anestesia general') : 'Coma';
      lista.push({ id, nombre: 'Conciencia', valor: t, nivel: p, tono: p > 0.93 ? 'alerta' : p > 0.5 ? 'medio' : 'ok' });
    } else if (id === 'fr') {
      const fr = Math.max(2, Math.round(14 * (1 - 0.9 * (e.depResp || 0))));
      lista.push({ id, nombre: 'Frecuencia respiratoria', valor: `${fr} rpm`, nivel: fr / 20, tono: fr < 8 ? 'alerta' : fr < 11 ? 'medio' : 'ok' });
    } else if (id === 'dolor') {
      const local = farmaco?.clase === 'anestesicoLocal';
      const eva = Math.round(8 * (1 - (local ? e.bloqueoSens || 0 : e.analgesia || 0)) * 10) / 10;
      lista.push({ id, nombre: 'Dolor (EVA 0-10)', valor: eva.toFixed(1), nivel: eva / 10, tono: eva > 6 ? 'alerta' : eva > 3 ? 'medio' : 'ok' });
    } else if (id === 'ansiedad') {
      const base = cat.escenario === 'ansiedad' ? 8.5 : 4;
      const a = Math.round(base * (1 - (e.ansiolisis || 0)) * 10) / 10;
      lista.push({ id, nombre: 'Ansiedad (0-10)', valor: a.toFixed(1), nivel: a / 10, tono: a > 6 ? 'alerta' : a > 3 ? 'medio' : 'ok' });
    } else if (id === 'memoria') {
      const a = e.amnesia || 0;
      lista.push({ id, nombre: 'Amnesia anterógrada', valor: `${Math.round(a * 100)} %`, nivel: a, tono: a > 0.5 ? 'medio' : 'ok' });
    } else if (id === 'ataxia') {
      const a = e.ataxia || 0;
      lista.push({ id, nombre: 'Ataxia / mareo', valor: `${Math.round(a * 100)} %`, nivel: a, tono: a > 0.5 ? 'alerta' : a > 0.25 ? 'medio' : 'ok' });
    } else if (id === 'movimiento') {
      const a = Math.max(e.anestesia || 0, e.relajacion || 0, e.bloqueoMotor || 0);
      lista.push({ id, nombre: 'Inmovilidad / relajación', valor: `${Math.round(a * 100)} %`, nivel: a, tono: 'ok' });
    } else if (id === 'crisis') {
      const tipo = opciones.crisis || 'tonicoClonica';
      const c = lim(nivelCrisis(farmaco, e, tipo), 0, 1.25);
      lista.push({ id, nombre: tipo === 'ausencia' ? 'Ausencias (punta-onda)' : 'Actividad epiléptica', valor: c > 1.02 ? 'Empeora' : `${Math.round(lim(c) * 100)} %`, nivel: lim(c), tono: c > 0.6 ? 'alerta' : c > 0.25 ? 'medio' : 'ok' });
    } else if (id === 'margen') {
      const r = e.depResp || 0;
      lista.push({ id, nombre: 'Riesgo de paro respiratorio', valor: r > 0.6 ? 'Alto' : r > 0.3 ? 'Moderado' : 'Bajo', nivel: r, tono: r > 0.6 ? 'alerta' : r > 0.3 ? 'medio' : 'ok' });
    } else if (id === 'd2') {
      const o = e.ocupacionD2 || 0;
      lista.push({ id, nombre: 'Ocupación D2 (PET)', valor: `${Math.round(o * 100)} %`, nivel: o, tono: o > 0.8 ? 'alerta' : o > 0.6 ? 'ok' : 'medio', marcas: [0.65, 0.78] });
    } else if (id === 'psicosis') {
      const s = 1 - (e.antipsicotico || 0);
      lista.push({ id, nombre: 'Síntomas positivos', valor: `${Math.round(s * 100)} %`, nivel: s, tono: s > 0.6 ? 'alerta' : s > 0.3 ? 'medio' : 'ok' });
    } else if (id === 'sep') {
      const s = e.sep || 0;
      lista.push({ id, nombre: 'Extrapiramidales (SEP)', valor: `${Math.round(s * 100)} %`, nivel: s, tono: s > 0.4 ? 'alerta' : s > 0.15 ? 'medio' : 'ok' });
    } else if (id === 'prolactina') {
      const s = e.prolactina || 0;
      lista.push({ id, nombre: 'Prolactina', valor: s > 0.5 ? 'Muy alta' : s > 0.2 ? 'Alta' : 'Normal', nivel: s, tono: s > 0.5 ? 'alerta' : s > 0.2 ? 'medio' : 'ok' });
    }
  }
  return lista;
}

export function ionizacion(farmaco, pH = 7.4) {
  if (farmaco?.pka == null) return null;
  const acido = ACIDOS.has(farmaco.id);
  const fNo = acido ? 1 / (1 + Math.pow(10, pH - farmaco.pka)) : 1 / (1 + Math.pow(10, farmaco.pka - pH));
  return { acido, noIonizada: fNo, ionizada: 1 - fNo };
}
