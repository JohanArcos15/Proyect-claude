// Comparador de fármacos lado a lado.
import { FARMACOS, POR_ID } from '../datos/farmacos.js';
import { CLASES } from '../datos/clases.js';
import { CATEGORIAS, CAT_POR_ID } from '../datos/categorias.js';
import { NT } from '../datos/neurotransmisores.js';
import { Sinapsis } from '../vistas/sinapsis.js';
import { Molecula3D } from '../vistas/molecula3d.js';
import { escenasPara } from '../logica/escena.js';
import { radarSVG } from './infografias.js';
import { grafica } from './simulador.js';

const PRESETS = [
  ['diazepam', 'fenobarbital', 'Benzodiacepina vs barbitúrico'],
  ['morfina', 'fentanilo', 'Morfina vs fentanilo'],
  ['codeina', 'tramadol', 'Opioides débiles'],
  ['ibuprofeno', 'celecoxib', 'AINE no selectivo vs COX-2'],
  ['ibuprofeno', 'paracetamol', 'Ibuprofeno vs acetaminofén'],
  ['lidocaina', 'bupivacaina', 'Lidocaína vs bupivacaína'],
  ['lidocaina', 'procaina', 'Amida vs éster'],
  ['propofol', 'ketamina', 'Propofol vs ketamina'],
  ['midazolam', 'dexmedetomidina', 'Midazolam vs dexmedetomidina'],
  ['succinilcolina', 'rocuronio', 'Relajantes musculares'],
  ['zolpidem', 'suvorexant', 'Zolpidem vs suvorexant'],
  ['alprazolam', 'buspirona', 'Alprazolam vs buspirona'],
  ['fenitoina', 'levetiracetam', 'Fenitoína vs levetiracetam'],
  ['valproato', 'lamotrigina', 'Valproato vs lamotrigina'],
  ['haloperidol', 'clozapina', 'Típico vs clozapina'],
  ['haloperidol', 'aripiprazol', 'Antagonista vs agonista parcial'],
];

let vivos = [];

export function limpiar() {
  for (const v of vivos) v.destruir?.();
  vivos = [];
}

const opcionesSelect = (sel) => CATEGORIAS.filter((c) => c.grupos.length).map((c) => `<optgroup label="${c.nombre}">${[...new Set(c.grupos.flatMap((g) => g.ids))].map((id) => `<option value="${id}" ${id === sel ? 'selected' : ''}>${POR_ID[id].nombre}</option>`).join('')}</optgroup>`).join('');

function categoriaDe(f) {
  return f.cat.map((c) => CAT_POR_ID[c]?.nombre).filter(Boolean).join(', ');
}

export function abrirComparador(raiz, a, b, ctx) {
  limpiar();
  const ida = POR_ID[a] ? a : 'diazepam';
  const idb = POR_ID[b] && b !== ida ? b : (ida === 'fenobarbital' ? 'diazepam' : PRESETS.find((p) => p[0] === ida)?.[1] || 'fenobarbital');
  const fa = POR_ID[ida], fb = POR_ID[idb];
  const ca = CLASES[fa.clase], cb = CLASES[fb.clase];
  const ma = ctx.moleculas[ida], mb = ctx.moleculas[idb];
  const col = (f, c, m, lado) => `
    <div class="comp-col">
      <div class="comp-cabeza">
        <select class="selector-farmaco" data-lado="${lado}" aria-label="Fármaco ${lado}">${opcionesSelect(f.id)}</select>
        <h2>${f.nombre}</h2>
        <div class="nota">${c.nombre} · ${f.grupo}</div>
      </div>
      <div class="comp-sin"><canvas data-sin="${lado}" aria-label="Mecanismo de ${f.nombre}"></canvas></div>
      <div class="comp-mol"><div class="mol2d">${m?.svg || ''}</div><div class="mol3d" data-mol3d="${lado}"><span class="ayuda">Arrastra para girar</span></div></div>
      <div style="padding:10px 14px"><a class="boton mini" href="#/${f.cat[0]}/${f.id}">Abrir en la app 3D →</a></div>
    </div>`;
  const filas = [
    ['Categoría', categoriaDe(fa), categoriaDe(fb)],
    ['Diana', ca.diana, cb.diana, true],
    ['Acción', ca.accion, cb.accion, true],
    ['Sistema', NT[ca.nt]?.nombre || '—', NT[cb.nt]?.nombre || '—', true],
    ['Efecto iónico', ca.efectoIonico, cb.efectoIonico, true],
    ['Vía', fa.pk.via, fb.pk.via],
    ['Inicio', fa.pk.inicio, fb.pk.inicio],
    ['Duración', fa.pk.duracion, fb.pk.duracion],
    ['Vida media', fa.pk.t12, fb.pk.t12],
    ['Metabolismo', fa.pk.metabolismo, fb.pk.metabolismo],
    ['pKa', fa.pka ?? '—', fb.pka ?? '—'],
    ['cLogP · masa', ma ? `${ma.clogp} · ${ma.masa} g/mol` : '—', mb ? `${mb.clogp} · ${mb.masa} g/mol` : '—'],
    ['Usos', fa.usos.slice(0, 3).join(' · '), fb.usos.slice(0, 3).join(' · ')],
    ['Efectos adversos', fa.adversos.slice(0, 4).join(' · '), fb.adversos.slice(0, 4).join(' · ')],
    ['Antídoto', fa.antidoto || (ca.antidoto ? POR_ID[ca.antidoto]?.nombre : '—') || '—', fb.antidoto || (cb.antidoto ? POR_ID[cb.antidoto]?.nombre : '—') || '—'],
    ['Clave', fa.clave, fb.clave],
  ];
  const afinidad = fa.afinidad && fb.afinidad;
  const pdComun = Object.keys({ ...ca.pd, ...(fa.pd || {}) }).some((k) => Object.keys({ ...cb.pd, ...(fb.pd || {}) }).includes(k)) || (ca.d2 && cb.d2);
  raiz.innerHTML = `<div class="marco">
    <div class="cabeza-herr"><div><h1>Comparador de fármacos</h1><p class="bajada">Dos fármacos lado a lado: su mecanismo animado, su estructura química y sus datos clave. Las filas resaltadas son las diferencias de mecanismo.</p></div><button class="boton" data-cerrar>✕ Cerrar</button></div>
    <div class="presets">${PRESETS.map(([x, y, t]) => `<a class="chip" href="#/comparador/${x}/${y}" aria-pressed="${x === ida && y === idb}">${t}</a>`).join('')}</div>
    <div class="comparador-grid">${col(fa, ca, ma, 'a')}${col(fb, cb, mb, 'b')}</div>
    <table class="tabla-comp">${filas.map(([n, x, y, mec]) => `<tr class="${mec && x !== y ? 'difiere' : ''}"><th>${n}</th><td>${x}</td><td>${y}</td></tr>`).join('')}</table>
    ${pdComun ? `<div class="caja" style="margin-top:14px"><div class="titulo-caja">Curvas dosis-efecto superpuestas</div><div style="max-width:620px">${grafica(fa, 1, {}, idb)}</div><p class="nota">Continua: ${fa.nombre}. Discontinua: ${fb.nombre}. Modelo didáctico (1 = dosis habitual).</p></div>` : ''}
    ${afinidad ? `<div class="caja"><div class="titulo-caja">Afinidad por receptores (pKi aproximado)</div><div style="max-width:420px">${radarSVG([ida, idb])}</div></div>` : ''}
  </div>`;
  raiz.querySelector('[data-cerrar]').addEventListener('click', ctx.cerrar);
  for (const s of raiz.querySelectorAll('select[data-lado]')) {
    s.addEventListener('change', () => {
      const na = s.dataset.lado === 'a' ? s.value : ida;
      const nb = s.dataset.lado === 'b' ? s.value : idb;
      location.hash = `#/comparador/${na}/${nb}`;
    });
  }
  // animaciones y moléculas
  for (const [lado, f] of [['a', fa], ['b', fb]]) {
    const sin = new Sinapsis(raiz.querySelector(`[data-sin="${lado}"]`));
    const esc = escenasPara(f)[0];
    sin.mostrar(esc.cfg, { nombre: f.nombre.split(' (')[0], aplicado: true, efecto: 0.75, semilla: lado === 'a' ? 3 : 5 });
    sin.opcion('rotulos', true);
    sin.opcion('frecuenciaAlta', true);
    sin.opcion('dosisParacetamol', 3.5);
    vivos.push(sin);
    const m = ctx.moleculas[f.id];
    if (m) {
      const v = new Molecula3D(raiz.querySelector(`[data-mol3d="${lado}"]`));
      v.mostrar(m, { hidrogenos: false });
      vivos.push(v);
    }
  }
  raiz.scrollTop = 0;
}
