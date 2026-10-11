// NeuroFarma 3D · controlador principal
import { gunzipSync, strFromU8 } from 'fflate';
import molGz from './datos/moleculas.json.gz';
import { Cerebro3D } from './vistas/cerebro3d.js';
import { Sinapsis } from './vistas/sinapsis.js';
import { Potencial } from './vistas/potencial.js';
import { Monitor } from './vistas/monitor.js';
import { CATEGORIAS, CAT_POR_ID } from './datos/categorias.js';
import { POR_ID } from './datos/farmacos.js';
import { CLASES, estadoClinico } from './datos/clases.js';
import { NT } from './datos/neurotransmisores.js';
import { VIAS, NUCLEOS } from './datos/anatomia.js';
import { estado as calcularEstado, configCerebro, escenasPara, configNeurona, configEEG, indicadores } from './logica/escena.js';
import { Lateral } from './ui/lateral.js';
import { Recorrido } from './ui/recorrido.js';
import { abrirComparador, limpiar as limpiarComparador } from './ui/comparador.js';
import { abrirCasos } from './ui/casos.js';
import { abrirQuiz } from './ui/quiz.js';

const MOLECULAS = JSON.parse(strFromU8(gunzipSync(molGz)));
const $ = (s) => document.querySelector(s);

const est = {
  cat: CAT_POR_ID.fundamentos,
  farmaco: null,
  aplicado: false,
  dosis: 1,
  opciones: { crisis: 'tonicoClonica', hipertermia: false, pH: 7.4, frecuenciaAlta: false, rotulos: true, corteza: 'cristal', naloxona: false, comparar: null },
  escena: 0,
  panelDerecho: 'potencial',
  paso: null,
};

// ---------------------------------------------------------------------------
// Vistas
const cerebro = new Cerebro3D($('#cerebro'), {
  alInteractuar: (info) => {
    if (info?.tipo === 'nucleo' || info?.tipo === 'estructura') cerebro.etiquetar([{ id: info.id }]);
  },
});
const sinapsis = new Sinapsis($('#lienzo-sinapsis'));
const potencial = new Potencial($('#lienzo-potencial'));
const monitor = new Monitor($('#lienzo-monitor'));
window.neurofarma = { cerebro, sinapsis, potencial, monitor, est };

const lateral = new Lateral($('#lateral'), MOLECULAS, {
  elegirFarmaco: (id) => { location.hash = `#/${est.cat.id}/${id}`; },
  iniciarRecorrido: () => recorrido.iniciar(est.cat),
  cambiarDosis: (d) => { est.dosis = d; programar(); lateral.refrescarDosis(); },
  opcion: (k, v) => { est.opciones[k] = v; actualizar(); },
});

const recorrido = new Recorrido($('#recorrido'), {
  alPaso: (p) => aplicarPaso(p),
  alCerrar: () => { est.paso = null; quitarFoco(); actualizar(); cerebro.etiquetar(etiquetasPorDefecto()); },
});

// ---------------------------------------------------------------------------
// Navegación
const nav = $('#nav');
nav.innerHTML = CATEGORIAS.map((c) => `<button data-cat="${c.id}" style="--c:${c.color}">${c.nombre}</button>`).join('');
nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (b) location.hash = `#/${b.dataset.cat}`;
});

function cerrarAmpliado() {
  for (const el of document.querySelectorAll('.panel.ampliado')) el.classList.remove('ampliado');
  if (velo) { velo.remove(); velo = null; }
}

function ruta() {
  cerrarAmpliado();
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c] = partes;
  const herr = $('#herramienta');
  if (a === 'comparador' || a === 'casos' || a === 'quiz') {
    herr.classList.remove('oculto');
    pausar(true);
    const ctx = { moleculas: MOLECULAS, irA: (cat, f, op) => irA(cat, f, op), cerrar: () => { location.hash = `#/${est.cat.id}${est.farmaco ? '/' + est.farmaco : ''}`; } };
    if (a === 'comparador') abrirComparador(herr, b, c, ctx);
    if (a === 'casos') abrirCasos(herr, b, ctx);
    if (a === 'quiz') abrirQuiz(herr, b, ctx);
    marcarNav(null);
    return;
  }
  herr.classList.add('oculto');
  limpiarComparador();
  herr.innerHTML = '';
  pausar(false);
  const cat = CAT_POR_ID[a] || CAT_POR_ID.fundamentos;
  let f = b && POR_ID[b] && (cat.grupos.some((g) => g.ids.includes(b))) ? b : null;
  if (!f && !b) f = cat.inicial;
  mostrar(cat, f);
}

function irA(catId, farmacoId, opciones = {}) {
  Object.assign(est.opciones, opciones);
  if (opciones.aplicar !== undefined) est.aplicado = opciones.aplicar;
  location.hash = `#/${catId}${farmacoId ? '/' + farmacoId : ''}`;
  if (opciones.aplicar !== undefined) setTimeout(() => { est.aplicado = !!opciones.aplicar; actualizar(); }, 30);
}

function marcarNav(id) {
  for (const b of nav.querySelectorAll('button')) {
    if (b.dataset.cat === id) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
}

function pausar(si) {
  for (const v of [cerebro, sinapsis, potencial, monitor]) v.pausado = si;
}

function mostrar(cat, farmacoId) {
  const cambioCat = cat !== est.cat;
  const cambioF = farmacoId !== est.farmaco;
  if (cambioCat && recorrido.activo) recorrido.cerrar();
  est.cat = cat;
  document.documentElement.style.setProperty('--cat', cat.color);
  marcarNav(cat.id);
  if (cambioF || cambioCat) {
    est.farmaco = farmacoId;
    est.escena = 0;
    est.dosis = (farmacoId && POR_ID[farmacoId].dosisCat?.[cat.id]) || 1;
    est.opciones.comparar = null;
    est.opciones.naloxona = false;
    if (cambioCat) est.aplicado = false;
    est.opciones.crisis = cat.escenario === 'epilepsia' && farmacoId === 'etosuximida' ? 'ausencia' : 'tonicoClonica';
    est.opciones.hipertermia = false;
    lateral.reiniciarQuimica();
  }
  lateral.render({ cat, farmaco: est.farmaco, dosis: est.dosis, opciones: est.opciones, aplicado: est.aplicado });
  actualizar({ forzarVista: cambioCat || cambioF });
  cerebro.etiquetar(etiquetasPorDefecto());
  document.title = `${est.farmaco ? POR_ID[est.farmaco].nombre + ' · ' : ''}${cat.nombre} · NeuroFarma 3D`;
}

// ---------------------------------------------------------------------------
// Actualización de todas las vistas
let pendiente = false;
function programar() {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => { pendiente = false; actualizar(); });
}

function dosisEfectiva() {
  const f = est.farmaco ? POR_ID[est.farmaco] : null;
  if (f && f.clase === 'opioide' && est.opciones.naloxona) return est.dosis / 9;
  return est.dosis;
}

function actualizar({ forzarVista = false } = {}) {
  const cat = est.cat;
  const f = est.farmaco ? POR_ID[est.farmaco] : null;
  const clase = f ? CLASES[f.clase] : null;
  const c = dosisEfectiva();
  const e = calcularEstado(f, est.aplicado, c);
  const ocupacion = f ? estadoClinico(f, clase, c).ocupacion : 0;
  const op = { ...est.opciones, aplicado: est.aplicado };

  // cerebro 3D
  const cfg = configCerebro(cat, f, e, op);
  const paso = est.paso;
  if (paso?.cerebro) {
    const x = paso.cerebro;
    if (x.vias) cfg.vias = { ...cfg.vias, ...x.vias };
    if (x.resaltar) cfg.resaltar = [...new Set([...(cfg.resaltar || []), ...x.resaltar])];
    if (x.zonas) cfg.zonas = x.zonas;
    if (x.actividad !== undefined) cfg.actividad = x.actividad;
  }
  if (paso?.vista) cfg.vista = paso.vista;
  cfg.corteza = est.opciones.corteza;
  cfg.forzarVista = forzarVista || !!paso?.vista;
  if (!forzarVista && !paso?.vista) delete cfg.vista;
  cerebro.aplicar(cfg);
  ultimoCfg = cfg;

  // escena molecular
  const escenas = escenasPara(f, { pasos: paso?.pasos, escenaFundamentos: paso?.escenaFundamentos });
  if (est.escena >= escenas.length) est.escena = 0;
  const esc = escenas[est.escena];
  sinapsis.mostrar(esc.cfg, { nombre: f ? f.nombre.split(' (')[0] : '', aplicado: est.aplicado, efecto: Math.max(0.15, ocupacion) });
  sinapsis.opcion('rotulos', est.opciones.rotulos);
  sinapsis.opcion('pH', est.opciones.pH);
  sinapsis.opcion('frecuenciaAlta', est.opciones.frecuenciaAlta);
  sinapsis.opcion('hipertermia', est.opciones.hipertermia);
  sinapsis.opcion('desencadenante', true);
  sinapsis.opcion('dosisParacetamol', f?.id === 'paracetamol' ? est.dosis : 3.5);
  sinapsis.opcion('nac', f?.id === 'acetilcisteina' && est.aplicado ? 1 : 0);
  renderCabezaEscena(escenas, esc, f);

  // neurona
  const ne = configNeurona(f, { ...e, ocupacion: ocupacion }, op);
  potencial.configurar(ne);
  potencial.aplicar(est.aplicado && !!f);

  // EEG y monitor
  const eeg = configEEG(cat, f, e, op);
  monitor.configurar(eeg.eeg, eeg.indice, eeg.etiqueta);
  renderIndicadores(indicadores(cat, f, e, op));

  renderInterruptor(f);
  renderTitulo(f, e);
  renderLeyenda(cfg, f);
  renderControles3D(cfg);
}
let ultimoCfg = null;

function etiquetasPorDefecto() {
  if (!ultimoCfg) return [];
  const ids = (ultimoCfg.resaltar || []).filter((id) => !['medula', 'nervio'].includes(id)).slice(0, 4);
  return ids;
}

// ---------------------------------------------------------------------------
// Piezas de interfaz
function renderInterruptor(f) {
  const el = $('#interruptor');
  if (!f) {
    el.innerHTML = `<div class="nombre">Sin fármaco seleccionado<b>Explora los sistemas</b></div>`;
    return;
  }
  el.innerHTML = `<div class="nombre">${CLASES[f.clase].nombre}<b>${f.nombre}</b></div>
    <div class="conmutador" role="group" aria-label="Aplicar fármaco">
      <button class="sin" data-aplicar="0" aria-pressed="${!est.aplicado}">Sin fármaco</button>
      <button data-aplicar="1" aria-pressed="${est.aplicado}">Con fármaco</button>
    </div>`;
}
$('#interruptor').addEventListener('click', (e) => {
  const b = e.target.closest('[data-aplicar]');
  if (!b) return;
  est.aplicado = b.dataset.aplicar === '1';
  actualizar();
  lateral.estado.aplicado = est.aplicado;
});

function renderTitulo(f, e) {
  const t = $('#titulo-escena');
  const sub = f ? (est.aplicado ? `Con fármaco · ${Math.abs(est.dosis - 1) > 0.05 ? `dosis ${est.dosis.toFixed(est.dosis < 1 ? 2 : 1)}× la habitual` : 'dosis habitual'}${est.opciones.naloxona ? ' + naloxona' : ''}` : 'Estado basal, sin fármaco') : est.cat.lema;
  t.innerHTML = `<div class="cat">${est.cat.nombre}</div><h1>${f ? f.nombre : 'Neurotransmisión'}</h1><p>${sub}</p>`;
}

function renderLeyenda(cfg, f) {
  const nts = new Set();
  for (const [id, v] of Object.entries(cfg.vias || {})) if (v > 0.05 && VIAS[id]) nts.add(VIAS[id].nt);
  for (const id of cfg.nucleos || []) if (NUCLEOS[id]) nts.add(NUCLEOS[id].nt);
  const items = [...nts].filter((k) => NT[k] && k !== 'NAV').map((k) => `<span><i style="background:${NT[k].color}"></i>${NT[k].nombre}</span>`);
  if (f && est.aplicado && cfg.dianas) items.push(`<span><i style="background:#ffe7a3;box-shadow:0 0 8px #ffe7a3"></i>Sitios de unión del fármaco</span>`);
  if (cfg.crisis) items.push(`<span><i style="background:#ffd28a"></i>Descarga epiléptica</span>`);
  $('#leyenda').innerHTML = items.join('');
}

function renderControles3D(cfg) {
  for (const b of document.querySelectorAll('[data-vista]')) b.setAttribute('aria-pressed', b.dataset.vista === cerebro.vistaActual);
  for (const b of document.querySelectorAll('[data-corteza]')) b.setAttribute('aria-pressed', b.dataset.corteza === est.opciones.corteza);
}
document.querySelector('.controles-3d').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.vista) { cerebro.vista(b.dataset.vista); renderControles3D(); setTimeout(() => cerebro.etiquetar(etiquetasPorDefecto()), 50); }
  if (b.dataset.corteza) { est.opciones.corteza = b.dataset.corteza; actualizar(); }
  if (b.dataset.giro !== undefined) { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); cerebro.autoGiro(on); }
  if (b.dataset.crisis) { est.opciones.crisis = b.dataset.crisis; actualizar({ forzarVista: true }); }
});

function renderCabezaEscena(escenas, esc, f) {
  const tabs = $('#escenas');
  tabs.innerHTML = escenas.length > 1 ? escenas.map((x, i) => `<button role="tab" data-escena="${i}" aria-selected="${i === est.escena}">${x.titulo}</button>`).join('') : '';
  tabs.style.display = escenas.length > 1 ? '' : 'none';
  const ctrl = $('#controles-escena');
  const tipo = esc.cfg.tipo;
  let html = '';
  if (tipo === 'axon' && esc.cfg.modo === 'anestesico-local') {
    html += `<label class="control-mini">pH <input type="range" min="60" max="80" value="${Math.round(est.opciones.pH * 10)}" data-ctrl="ph" aria-label="pH del tejido"><b class="mono">${est.opciones.pH.toFixed(1)}</b></label>`;
  }
  if (tipo === 'axon' && (esc.cfg.modo === 'uso-dependiente' || esc.cfg.modo === 'inactivacion-lenta')) {
    html += `<button class="chip-toggle" data-ctrl="frecuencia" aria-pressed="${est.opciones.frecuenciaAlta}">Alta frecuencia</button>`;
  }
  if (tipo === 'placa') {
    html += `<button class="chip-toggle alerta" data-ctrl="hm" aria-pressed="${est.opciones.hipertermia}">Hipertermia maligna</button>`;
  }
  if (est.cat.escenario === 'epilepsia') {
    html += `<div class="pestanas-mini" role="group" aria-label="Tipo de crisis"><button data-ctrl-crisis="tonicoClonica" aria-selected="${est.opciones.crisis === 'tonicoClonica'}">Tónico-clónica</button><button data-ctrl-crisis="ausencia" aria-selected="${est.opciones.crisis === 'ausencia'}">Ausencia</button></div>`;
  }
  ctrl.innerHTML = html;
  $('#btn-rotulos').setAttribute('aria-pressed', est.opciones.rotulos);
}
$('#panel-sinapsis').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.escena) { est.escena = +b.dataset.escena; actualizar(); }
  if (b.dataset.ctrl === 'frecuencia') { est.opciones.frecuenciaAlta = !est.opciones.frecuenciaAlta; actualizar(); }
  if (b.dataset.ctrl === 'hm') { est.opciones.hipertermia = !est.opciones.hipertermia; actualizar(); }
  if (b.dataset.ctrlCrisis) { est.opciones.crisis = b.dataset.ctrlCrisis; actualizar({ forzarVista: true }); }
  if (b.id === 'btn-rotulos') { est.opciones.rotulos = !est.opciones.rotulos; actualizar(); }
});
$('#panel-sinapsis').addEventListener('input', (e) => {
  if (e.target.dataset.ctrl === 'ph') {
    est.opciones.pH = +e.target.value / 10;
    e.target.nextElementSibling.textContent = est.opciones.pH.toFixed(1);
    sinapsis.opcion('pH', est.opciones.pH);
    lateral.refrescarDosis();
  }
});

function renderIndicadores(lista) {
  $('#indicadores').innerHTML = lista.map((i) => `<div class="indicador" data-tono="${i.tono}"><div class="n">${i.nombre}</div><div class="v">${i.valor}</div><div class="barra-ind"><i style="width:${Math.round(Math.min(1, i.nivel) * 100)}%"></i>${(i.marcas || []).map((m) => `<b style="left:${m * 100}%"></b>`).join('')}</div></div>`).join('');
}

// panel derecho: potencial / monitor
function panelDerecho(p) {
  est.panelDerecho = p;
  for (const b of document.querySelectorAll('#pest-derecho [data-panel]')) b.setAttribute('aria-selected', b.dataset.panel === p);
  $('#cuerpo-potencial').classList.toggle('oculto', p !== 'potencial');
  $('#cuerpo-monitor').classList.toggle('oculto', p !== 'monitor');
}
$('#pest-derecho').addEventListener('click', (e) => {
  const b = e.target.closest('[data-panel]');
  if (b) panelDerecho(b.dataset.panel);
});

// ampliar paneles
let velo = null;
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ampliar]');
  if (!b) return;
  const panel = document.getElementById(b.dataset.ampliar);
  const amp = panel.classList.toggle('ampliado');
  if (amp) {
    velo = document.createElement('div');
    velo.className = 'velo';
    velo.addEventListener('click', () => { panel.classList.remove('ampliado'); velo.remove(); velo = null; });
    document.body.appendChild(velo);
  } else if (velo) { velo.remove(); velo = null; }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && velo) velo.click();
});

// ---------------------------------------------------------------------------
// Recorrido guiado
function quitarFoco() {
  for (const el of document.querySelectorAll('.foco')) el.classList.remove('foco');
}

function aplicarPaso(p) {
  est.paso = p;
  quitarFoco();
  if (p.farmaco !== undefined && p.farmaco !== est.farmaco) {
    est.farmaco = p.farmaco;
    est.escena = 0;
    lateral.reiniciarQuimica();
  }
  if (p.aplicado !== undefined) est.aplicado = p.aplicado;
  est.dosis = p.dosis ?? ((est.farmaco && POR_ID[est.farmaco].dosisCat?.[est.cat.id]) || 1);
  est.opciones.crisis = p.crisis || (est.cat.escenario === 'epilepsia' ? est.opciones.crisis : 'tonicoClonica');
  est.opciones.hipertermia = !!p.hipertermia;
  est.opciones.frecuenciaAlta = !!p.frecuenciaAlta;
  est.opciones.naloxona = false;
  if (p.panelDerecho) panelDerecho(p.panelDerecho);
  history.replaceState(null, '', `#/${est.cat.id}${est.farmaco ? '/' + est.farmaco : ''}`);
  if (p.pestana) lateral.pestana = p.pestana;
  if (p.infografia) lateral.pestana = 'claves';
  lateral.render({ cat: est.cat, farmaco: est.farmaco, dosis: est.dosis, opciones: est.opciones, aplicado: est.aplicado });
  if (p.infografia) lateral.irAPestana('claves', p.infografia);
  actualizar({ forzarVista: !!p.vista });
  cerebro.etiquetar(p.etiquetas || etiquetasPorDefecto());
  const foco = { cerebro: '#escenario', sinapsis: '#panel-sinapsis', potencial: '#panel-derecho', monitor: '#panel-derecho', info: '#lateral' }[p.foco];
  if (foco) $(foco).classList.add('foco');
  if (p.foco === 'potencial') panelDerecho('potencial');
  if (p.foco === 'monitor') panelDerecho('monitor');
  document.title = `${p.titulo} · NeuroFarma 3D`;
}

// ---------------------------------------------------------------------------
window.addEventListener('hashchange', ruta);
ruta();
// en la primera visita, ofrecer el recorrido de fundamentos
if (!location.hash || location.hash === '#/fundamentos') {
  try {
    if (!localStorage.getItem('neurofarma-visto')) {
      localStorage.setItem('neurofarma-visto', '1');
      setTimeout(() => { if (est.cat.id === 'fundamentos' && !recorrido.activo) recorrido.iniciar(CAT_POR_ID.fundamentos); }, 900);
    }
  } catch { /* almacenamiento no disponible */ }
}
