// Pestaña «Dosis»: curvas dosis-efecto y controles especiales por grupo.
import { CLASES, EFECTOS, hill, ocupacionD2, estadoClinico, NOTA_MODELO } from '../datos/clases.js';
import { FARMACOS, POR_ID } from '../datos/farmacos.js';
import { ionizacion } from '../logica/escena.js';

const COLORES = {
  ansiolisis: '#4dc3ff', sedacion: '#7c8cff', hipnosis: '#a47bff', anestesia: '#5a8fff', amnesia: '#c38bff',
  analgesia: '#3dd6d0', depResp: '#ff6b6b', anticonvulsivo: '#3fd69b', relajacion: '#9fd8ff', ataxia: '#ffb547',
  nausea: '#d9a86c', antiinflamatorio: '#ff9e80', antipiretico: '#f0d68a', bloqueoSens: '#3dd6d0', bloqueoMotor: '#7c8cff',
  toxicidad: '#ff6b6b', hepatotoxicidad: '#ff6b6b', antipsicotico: '#3fd69b', sep: '#ff6b6b', prolactina: '#ffb547', ocupacionD2: '#ffe7a3',
};

const fmt = (x, d = 1) => x.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });

// Ejes de dosis por fármaco
export function ejeDosis(farmaco) {
  const clase = CLASES[farmaco.clase];
  if (clase.d2 && farmaco.d2) {
    const { rango, dosisRef, unidad } = farmaco.d2;
    return { min: rango[0] / 2 / dosisRef, max: (rango[1] * 1.4) / dosisRef, etiqueta: (c) => `${fmt(c * dosisRef, c * dosisRef < 10 ? 1 : 0)} ${unidad}`, eje: unidad };
  }
  if (farmaco.clase === 'inhalado') {
    return { min: 0.1, max: 2.5, etiqueta: (c) => `${fmt(c, 2)} CAM${farmaco.cam ? ` (${fmt(c * farmaco.cam, farmaco.cam > 10 ? 0 : 1)} %)` : ''}`, eje: 'CAM' };
  }
  if (farmaco.id === 'paracetamol') return { min: 0.1, max: 6, etiqueta: (c) => `${fmt(c * 4, 1)} g/día`, eje: '× 4 g/día' };
  return { min: 0.08, max: 8, etiqueta: (c) => `${fmt(c, c < 1 ? 2 : 1)} × dosis habitual`, eje: '× dosis habitual' };
}

function curvas(farmaco, opciones) {
  const clase = CLASES[farmaco.clase];
  const pd = { ...(clase.pd || {}), ...(farmaco.pd || {}) };
  const claves = Object.keys(pd);
  if (clase.d2 && farmaco.d2) claves.unshift('ocupacionD2', 'antipsicotico', 'sep', 'prolactina');
  if (farmaco.d2?.sedacionH1 && !claves.includes('sedacion')) claves.push('sedacion');
  return claves;
}

function valor(farmaco, clave, c, opciones) {
  const clase = CLASES[farmaco.clase];
  const cEf = clase === CLASES.opioide && opciones.naloxona ? c / 9 : c;
  return estadoClinico(farmaco, clase, cEf)[clave] ?? 0;
}

export function grafica(farmaco, c, opciones, comparar) {
  const W = 380, H = 220, m = { l: 36, r: 10, t: 12, b: 34 };
  const eje = ejeDosis(farmaco);
  const lx0 = Math.log10(eje.min), lx1 = Math.log10(eje.max);
  const X = (v) => m.l + ((Math.log10(v) - lx0) / (lx1 - lx0)) * (W - m.l - m.r);
  const Y = (v) => m.t + (1 - v) * (H - m.t - m.b);
  let s = `<svg class="sim-grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="Curvas dosis-efecto">`;
  // ventana terapéutica D2
  if (CLASES[farmaco.clase].d2) {
    s += `<rect x="${m.l}" y="${Y(0.78)}" width="${W - m.l - m.r}" height="${Y(0.65) - Y(0.78)}" fill="#3fd69b" opacity=".09"/>`;
    s += `<text x="${W - m.r - 4}" y="${Y(0.715) + 4}" fill="#3fd69b" font-size="9.5" text-anchor="end" font-family="Texto">ventana D2 65-78 %</text>`;
  }
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1f2b40" stroke-width="1"/>`;
    s += `<text x="${m.l - 6}" y="${Y(v) + 3}" fill="#6b7891" font-size="9.5" text-anchor="end" font-family="JetBrains Mono, monospace">${Math.round(v * 100)}</text>`;
  }
  const marcas = [];
  for (let e = Math.floor(lx0); e <= Math.ceil(lx1); e++) for (const k of [1, 2, 5]) { const v = k * Math.pow(10, e); if (v >= eje.min && v <= eje.max) marcas.push(v); }
  for (const v of marcas) {
    s += `<line x1="${X(v)}" x2="${X(v)}" y1="${m.t}" y2="${H - m.b}" stroke="#16202f"/>`;
    s += `<text x="${X(v)}" y="${H - m.b + 13}" fill="#6b7891" font-size="9.5" text-anchor="middle" font-family="JetBrains Mono, monospace">${eje.etiqueta(v).split(' ')[0]}</text>`;
  }
  s += `<text x="${(W + m.l) / 2}" y="${H - 6}" fill="#a3b0c6" font-size="10.5" text-anchor="middle" font-family="Texto">Dosis (${eje.eje}, escala log)</text>`;
  const pinta = (f, claves, discont) => {
    for (const k of claves) {
      let d = '';
      for (let i = 0; i <= 80; i++) {
        const v = Math.pow(10, lx0 + ((lx1 - lx0) * i) / 80);
        const y = valor(f, k, v, opciones);
        d += `${i ? 'L' : 'M'}${X(v).toFixed(1)},${Y(Math.min(1, y)).toFixed(1)}`;
      }
      s += `<path d="${d}" fill="none" stroke="${COLORES[k] || '#ccc'}" stroke-width="${k === 'depResp' || k === 'ocupacionD2' ? 2.4 : 1.8}" ${discont ? 'stroke-dasharray="5 4" opacity=".85"' : ''}/>`;
    }
  };
  const claves = curvas(farmaco, opciones);
  pinta(farmaco, claves, false);
  if (comparar && POR_ID[comparar]) {
    const fc = POR_ID[comparar];
    pinta(fc, curvas(fc, opciones).filter((k) => claves.includes(k)), true);
  }
  const xc = X(Math.max(eje.min, Math.min(eje.max, c)));
  s += `<line x1="${xc}" x2="${xc}" y1="${m.t - 2}" y2="${H - m.b}" stroke="#ffe7a3" stroke-width="1.5"/><circle cx="${xc}" cy="${m.t - 2}" r="3.5" fill="#ffe7a3"/>`;
  return s + '</svg>';
}

function fenitoinaMM(c) {
  // Css = Km·R / (Vmax − R); Vmax 7 mg/kg/d y Km 4 mg/L para 70 kg (valores poblacionales típicos)
  const Vmax = 490, Km = 4;
  const W = 380, H = 170, m = { l: 36, r: 10, t: 10, b: 30 };
  const R0 = 100, R1 = 470;
  const X = (r) => m.l + ((r - R0) / (R1 - R0)) * (W - m.l - m.r);
  const Y = (cs) => m.t + (1 - Math.min(cs, 50) / 50) * (H - m.t - m.b);
  let s = `<svg class="sim-grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cinética de Michaelis-Menten de la fenitoína">`;
  s += `<rect x="${m.l}" y="${Y(20)}" width="${W - m.l - m.r}" height="${Y(10) - Y(20)}" fill="#3fd69b" opacity=".12"/>`;
  s += `<text x="${m.l + 4}" y="${Y(15) + 3}" fill="#3fd69b" font-size="9.5" font-family="Texto">rango 10-20 mg/L</text>`;
  for (const v of [0, 10, 20, 30, 40, 50]) s += `<text x="${m.l - 6}" y="${Y(v) + 3}" fill="#6b7891" font-size="9.5" text-anchor="end" font-family="JetBrains Mono">${v}</text><line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#16202f"/>`;
  for (const r of [100, 200, 300, 400]) s += `<text x="${X(r)}" y="${H - m.b + 13}" fill="#6b7891" font-size="9.5" text-anchor="middle" font-family="JetBrains Mono">${r}</text>`;
  let d = '', dl = '';
  for (let r = R0; r <= R1; r += 3) {
    const cs = (Km * r) / (Vmax - r);
    d += `${r === R0 ? 'M' : 'L'}${X(r).toFixed(1)},${Y(cs).toFixed(1)}`;
    const lin = (r / 300) * ((Km * 300) / (Vmax - 300));
    dl += `${r === R0 ? 'M' : 'L'}${X(r).toFixed(1)},${Y(lin).toFixed(1)}`;
  }
  s += `<path d="${dl}" stroke="#6b7891" stroke-dasharray="4 4" fill="none"/><path d="${d}" stroke="#ffe7a3" stroke-width="2.2" fill="none"/>`;
  const R = Math.min(R1, c * 300);
  const cs = (Km * R) / (Vmax - R);
  s += `<circle cx="${X(R)}" cy="${Y(cs)}" r="4.5" fill="#ffe7a3"/>`;
  s += `<text x="${(W + m.l) / 2}" y="${H - 4}" fill="#a3b0c6" font-size="10.5" text-anchor="middle" font-family="Texto">Dosis diaria (mg/día) · Css (mg/L)</text></svg>`;
  return { svg: s, R, cs };
}

export function renderSimulador(cont, { farmaco, dosis, opciones, aplicado }) {
  const clase = CLASES[farmaco.clase];
  const claves = curvas(farmaco, opciones);
  if (!claves.length || farmaco.clase === 'antidotoParacetamol') {
    cont.innerHTML = `<p>Este fármaco no tiene una curva dosis-efecto propia en el modelo: ${farmaco.clase === 'antagonistaOpioide' ? 'su efecto es revertir al opioide. Abre un opioide y activa «Añadir naloxona» en su simulador.' : farmaco.clase === 'antagonistaBZD' ? 'su efecto es revertir a las benzodiacepinas (mira el potencial de acción).' : 'actúa como antídoto (mira la escena del hígado).'}</p>`;
    return;
  }
  const eje = ejeDosis(farmaco);
  const lmin = Math.log10(eje.min), lmax = Math.log10(eje.max);
  const pos = ((Math.log10(Math.max(eje.min, Math.min(eje.max, dosis))) - lmin) / (lmax - lmin)) * 1000;
  const cEf = clase === CLASES.opioide && opciones.naloxona ? dosis / 9 : dosis;
  const e = estadoClinico(farmaco, clase, cEf);
  const candidatosComp = FARMACOS.filter((f) => f.id !== farmaco.id && (CLASES[f.clase].pd && Object.keys({ ...CLASES[f.clase].pd, ...(f.pd || {}) }).some((k) => claves.includes(k)) || (CLASES[f.clase].d2 && clase.d2)));
  const sugerido = { bzd: 'fenobarbital', barbiturico: 'diazepam', z: 'triazolam', opioide: 'tramadol', tipico: 'aripiprazol', atipico: 'haloperidol', agonistaParcialD2: 'haloperidol', anestesicoIV: 'midazolam', inhalado: 'desflurano', anestesicoLocal: 'bupivacaina', aine: 'paracetamol' }[farmaco.clase];
  let html = `
    <p class="nota" style="margin-top:0">Mueve la dosis: el cerebro 3D, la sinapsis, el potencial de acción y el monitor cambian a la vez${aplicado ? '' : ' (activa «Con fármaco» para verlo)'}.</p>
    <div class="sim-control">
      <span class="nota">Baja</span>
      <input type="range" min="0" max="1000" step="1" value="${pos.toFixed(0)}" data-sim="dosis" aria-label="Dosis">
      <span class="nota">Alta</span>
    </div>
    <div class="sim-estado"><span class="nota">Dosis</span><span class="sim-valor" data-sim-valor>${eje.etiqueta(dosis)}</span></div>
    <div data-sim-grafica>${grafica(farmaco, dosis, opciones, opciones.comparar)}</div>
    <div class="efectos" data-sim-efectos>${efectosHTML(claves, e)}</div>`;
  if (clase === CLASES.opioide) html += `<div class="caja"><label class="control-mini"><input type="checkbox" data-sim="naloxona" ${opciones.naloxona ? 'checked' : ''}> <b>Añadir naloxona</b> (antagonista competitivo)</label><div class="nota">Desplaza las curvas a la derecha: hace falta mucho más opioide para el mismo efecto. Así revierte la depresión respiratoria.</div></div>`;
  if (farmaco.clase === 'anestesicoLocal') {
    const ion = ionizacion(farmaco, opciones.pH ?? 7.4);
    html += `<div class="caja"><div class="titulo-caja">pH del tejido (Henderson-Hasselbalch)</div>
      <div class="sim-control"><span class="nota">6,0</span><input type="range" min="60" max="80" step="1" value="${Math.round((opciones.pH ?? 7.4) * 10)}" data-sim="ph" aria-label="pH del tejido"><span class="nota">8,0</span></div>
      <div class="barra-ion"><span class="no" style="width:${(ion.noIonizada * 100).toFixed(0)}%">B ${(ion.noIonizada * 100).toFixed(0)} %</span><span class="si" style="width:${(ion.ionizada * 100).toFixed(0)}%">BH⁺ ${(ion.ionizada * 100).toFixed(0)} %</span></div>
      <div class="nota">pH ${fmt(opciones.pH ?? 7.4, 1)} · pKa ${fmt(farmaco.pka, 1)}. Solo la base (B) cruza la membrana: en tejido inflamado (pH ≈ 6,5) el inicio es lento y el bloqueo débil.</div></div>`;
  }
  if (farmaco.id === 'fenitoina') {
    const mm = fenitoinaMM(dosis);
    html += `<div class="caja"><div class="titulo-caja">Cinética no lineal (Michaelis-Menten)</div>${mm.svg}<div class="nota">${Math.round(mm.R)} mg/día → Css ≈ <b class="mono">${fmt(mm.cs, 1)} mg/L</b>. La línea punteada es lo que se esperaría con cinética lineal: cerca de la saturación, un pequeño aumento de dosis dispara la concentración (Vmax 7 mg/kg/día, Km 4 mg/L).</div></div>`;
  }
  if (farmaco.rango) html += `<p class="nota">Rango terapéutico de referencia: <b class="mono">${farmaco.rango[0]}-${farmaco.rango[1]} ${farmaco.unidadRango}</b>.</p>`;
  html += `<div class="caja"><div class="titulo-caja">Comparar curvas con…</div>
    <select class="selector-farmaco" data-sim="comparar"><option value="">— Ninguno —</option>${candidatosComp.map((f) => `<option value="${f.id}" ${opciones.comparar === f.id ? 'selected' : ''}>${f.nombre}</option>`).join('')}</select>
    ${sugerido && !opciones.comparar ? `<button class="boton mini" style="margin-top:8px" data-sim-sugerido="${sugerido}">Probar con ${POR_ID[sugerido].nombre}</button>` : ''}
    <div class="nota" style="margin-top:6px">Línea continua: ${farmaco.nombre}. Discontinua: fármaco comparado.</div></div>
    <p class="nota">${NOTA_MODELO}${clase.d2 ? ' Ocupación D2: modelo hiperbólico ajustado a estudios PET (Kapur 2000; Uchida 2011).' : ''}</p>`;
  cont.innerHTML = html;
}

function efectosHTML(claves, e) {
  return claves.map((k) => {
    const v = Math.max(0, Math.min(1, e[k] ?? 0));
    const nombre = k === 'ocupacionD2' ? 'Ocupación D2' : EFECTOS[k]?.nombre || k;
    return `<div class="efecto"><span style="color:${COLORES[k] || '#ccc'}">${nombre}</span><span class="b"><i style="width:${(v * 100).toFixed(0)}%;background:${COLORES[k] || '#ccc'}"></i></span><span class="p">${Math.round(v * 100)} %</span></div>`;
  }).join('');
}

// Actualización rápida mientras se arrastra (sin rehacer todo el panel)
export function refrescarSimulador(cont, { farmaco, dosis, opciones }) {
  const clase = CLASES[farmaco.clase];
  const eje = ejeDosis(farmaco);
  const v = cont.querySelector('[data-sim-valor]');
  if (v) v.textContent = eje.etiqueta(dosis);
  const g = cont.querySelector('[data-sim-grafica]');
  if (g) g.innerHTML = grafica(farmaco, dosis, opciones, opciones.comparar);
  const cEf = clase === CLASES.opioide && opciones.naloxona ? dosis / 9 : dosis;
  const ef = cont.querySelector('[data-sim-efectos]');
  if (ef) ef.innerHTML = efectosHTML(curvas(farmaco, opciones), estadoClinico(farmaco, clase, cEf));
}

export function dosisDesdeSlider(farmaco, pos) {
  const eje = ejeDosis(farmaco);
  const l = Math.log10(eje.min) + (pos / 1000) * (Math.log10(eje.max) - Math.log10(eje.min));
  return Math.pow(10, l);
}
