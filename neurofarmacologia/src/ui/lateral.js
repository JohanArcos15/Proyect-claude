// Panel lateral: categoría, selector de fármacos y pestañas de información.
import { CLASES } from '../datos/clases.js';
import { POR_ID } from '../datos/farmacos.js';
import { NT } from '../datos/neurotransmisores.js';
import { INFOGRAFIAS } from './infografias.js';
import { renderSimulador, refrescarSimulador, dosisDesdeSlider } from './simulador.js';
import { ionizacion } from '../logica/escena.js';
import { Molecula3D } from '../vistas/molecula3d.js';

const PESTANAS = [['mecanismo', 'Mecanismo'], ['ficha', 'Ficha'], ['quimica', 'Química'], ['dosis', 'Dosis'], ['claves', 'Claves']];
const fmt = (x, d = 2) => (x == null ? '—' : Number(x).toLocaleString('es-CO', { maximumFractionDigits: d }));

export class Lateral {
  constructor(raiz, moleculas, acciones) {
    this.raiz = raiz;
    this.moleculas = moleculas;
    this.acciones = acciones; // { elegirFarmaco, iniciarRecorrido, cambiarDosis, opcion, irComparador }
    this.pestana = 'mecanismo';
    this.grupoQuim = null;
    this.hidrogenos = true;
    this.contMol = document.createElement('div');
    this.contMol.className = 'mol3d';
    this.contMol.innerHTML = '<span class="ayuda">Arrastra para girar</span><div class="opciones"><button class="chip-toggle" data-mol="h" aria-pressed="true">H</button><button class="chip-toggle" data-mol="giro" aria-pressed="true">↻</button></div>';
    raiz.addEventListener('click', (e) => this._clic(e));
    raiz.addEventListener('input', (e) => this._entrada(e));
    raiz.addEventListener('change', (e) => this._cambio(e));
  }

  render(estado) {
    this.estado = estado;
    const { cat, farmaco } = estado;
    const f = farmaco ? POR_ID[farmaco] : null;
    this.raiz.style.setProperty('--cat', cat.color);
    let html = `<div class="lat-cabeza">
      <div class="cat">${cat.id === 'fundamentos' ? 'Empieza aquí' : 'Categoría'}</div>
      <h2>${cat.nombre}</h2>
      <p class="lema">${cat.lema}</p>
      ${f ? `<details class="intro-det"><summary>Introducción al tema</summary><p class="intro">${cat.intro}</p></details>` : `<p class="intro">${cat.intro}</p>`}
      <div class="acciones"><button class="boton primario" data-accion="recorrido"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Recorrido guiado · ${cat.recorrido.length} pasos</button>
      ${cat.infografias?.length && f ? `<button class="boton" data-pestana="claves">Claves</button>` : ''}</div>
    </div>`;
    if (cat.grupos.length) {
      html += `<div class="selector">${cat.grupos.map((g) => `<h4>${g.nombre}</h4><div class="chips">${g.ids.map((id) => `<button class="chip" data-farmaco="${id}" aria-pressed="${id === farmaco}">${POR_ID[id].nombre.split(' (')[0]}</button>`).join('')}</div>`).join('')}</div>`;
    }
    if (f) {
      const clase = CLASES[f.clase];
      html += `<div class="ficha-cabeza"><div class="clase">${clase.nombre}</div><h3>${f.nombre}</h3><p class="grupo">${f.grupo}</p></div>
      <div class="pestanas" role="tablist">${PESTANAS.map(([id, t]) => `<button role="tab" data-pestana="${id}" aria-selected="${id === this.pestana}">${t}</button>`).join('')}</div>
      <div class="contenido" id="contenido-pestana"></div>`;
    } else {
      html += `<div class="contenido">${(cat.infografias || []).map((k) => this._info(k)).join('')}</div>`;
    }
    this.raiz.innerHTML = html;
    this._montarInfografias(this.raiz);
    if (f) this._pestana();
  }

  _info(k) {
    const g = INFOGRAFIAS[k];
    if (!g) return '';
    return `<section class="caja" data-info="${k}"><div class="titulo-caja">${g.titulo}</div>${g.html({ farmaco: this.estado?.farmaco })}</section>`;
  }

  _montarInfografias(raiz) {
    for (const s of raiz.querySelectorAll('[data-info]')) INFOGRAFIAS[s.dataset.info]?.montar?.(s);
  }

  irAPestana(p, info) {
    this.pestana = p;
    if (!this.estado?.farmaco) {
      if (info) this.raiz.querySelector(`[data-info="${info}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    for (const b of this.raiz.querySelectorAll('.pestanas [data-pestana]')) b.setAttribute('aria-selected', b.dataset.pestana === p);
    this._pestana();
    if (info) requestAnimationFrame(() => this.raiz.querySelector(`[data-info="${info}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  _pestana() {
    const cont = this.raiz.querySelector('#contenido-pestana');
    if (!cont) return;
    const { cat, farmaco } = this.estado;
    const f = POR_ID[farmaco];
    const clase = CLASES[f.clase];
    const p = this.pestana;
    if (p === 'mecanismo') {
      const nt = NT[clase.nt];
      const antid = f.antidoto || (clase.antidoto && POR_ID[clase.antidoto]?.nombre);
      cont.innerHTML = `<dl class="dato">
          <dt>Diana</dt><dd>${clase.diana}</dd>
          <dt>Acción</dt><dd>${clase.accion}</dd>
          ${nt ? `<dt>Sistema</dt><dd><span style="color:${nt.color};font-weight:700">● ${nt.nombre}</span> · ${nt.tipo}</dd>` : ''}
          <dt>Efecto iónico</dt><dd>${clase.efectoIonico}</dd>
          ${clase.latencia ? `<dt>Latencia</dt><dd>${clase.latencia}</dd>` : ''}
        </dl>
        <p>${clase.mecanismo}</p>
        ${f.mecanismoExtra ? `<div class="caja"><div class="titulo-caja">Particularidad de ${f.nombre.split(' (')[0]}</div>${f.mecanismoExtra}</div>` : ''}
        ${clase.subunidades ? `<table class="tabla"><thead><tr><th>Subunidad</th><th>Efecto</th></tr></thead><tbody>${clase.subunidades.map(([s, t]) => `<tr><td><b>${s}</b></td><td>${t}</td></tr>`).join('')}</tbody></table>` : ''}
        <div class="caja clave"><div class="titulo-caja">★ Para el parcial</div>${f.clave}</div>
        ${antid ? `<p><span class="etiqueta">Antídoto</span> ${antid}</p>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="boton mini" data-pestana="dosis">Probar dosis</button><a class="boton mini" href="#/comparador/${f.id}">Comparar con otro</a></div>`;
    } else if (p === 'ficha') {
      const ion = ionizacion(f, 7.4);
      cont.innerHTML = `<h5>Usos</h5><ul>${f.usos.map((u) => `<li>${u}</li>`).join('')}</ul>
        <h5>Farmacocinética</h5><dl class="dato">
          <dt>Vía</dt><dd>${f.pk.via}</dd><dt>Inicio</dt><dd>${f.pk.inicio}</dd><dt>Duración</dt><dd>${f.pk.duracion}</dd><dt>Vida media</dt><dd>${f.pk.t12}</dd><dt>Metabolismo</dt><dd>${f.pk.metabolismo}</dd>
          ${f.cam ? `<dt>CAM</dt><dd class="mono">${fmt(f.cam)} %</dd><dt>Sangre/gas</dt><dd class="mono">${fmt(f.sangreGas)}</dd>` : ''}
          ${f.dosisMax ? `<dt>Dosis máxima</dt><dd>${f.dosisMax}</dd>` : ''}
          ${f.rango ? `<dt>Rango terapéutico</dt><dd class="mono">${f.rango[0]}-${f.rango[1]} ${f.unidadRango}</dd>` : ''}
        </dl>
        ${ion ? `<h5>Ionización a pH 7,4 (pKa ${fmt(f.pka, 1)}, ${ion.acido ? 'ácido' : 'base'} débil)</h5>
          <div class="barra-ion"><span class="no" style="width:${(ion.noIonizada * 100).toFixed(0)}%">${(ion.noIonizada * 100).toFixed(0)} % no ionizada</span><span class="si" style="width:${(ion.ionizada * 100).toFixed(0)}%">${(ion.ionizada * 100).toFixed(0)} %</span></div>
          <p class="nota">La forma no ionizada es la que atraviesa membranas (barrera hematoencefálica, membrana del axón).</p>` : ''}
        <h5>Efectos adversos</h5><ul class="lista-rams">${f.adversos.map((a) => `<li>${a}</li>`).join('')}</ul>
        ${f.antidoto ? `<p><span class="etiqueta">Antídoto</span> ${f.antidoto}</p>` : ''}
        <div class="caja clave"><div class="titulo-caja">★ Para el parcial</div>${f.clave}</div>`;
    } else if (p === 'quimica') {
      const m = this.moleculas[f.id];
      if (!m) { cont.innerHTML = '<p>Estructura no disponible.</p>'; return; }
      const lip = [m.masa <= 500, m.clogp <= 5, m.hbd <= 5, m.hba <= 10].filter(Boolean).length;
      cont.innerHTML = `<div class="mol2d">${m.svg}</div>
        <div class="grupos-quim">${m.grupos.map((g, i) => `<button class="grupo-quim" data-grupo="${i}" aria-pressed="${this.grupoQuim === i}"><i style="background:var(--g-${g.color})"></i><span>${g.etiqueta}</span></button>`).join('')}</div>
        <div data-mol-hueco></div>
        <div class="descriptores">
          <div><small>Fórmula</small><b>${m.formula.replace(/(\d+)/g, '<sub>$1</sub>').replace(/\+(\d*)$/, '<sup>$1+</sup>')}</b></div>
          <div><small>Masa molar</small><b>${fmt(m.masa, 1)}</b></div>
          <div><small>cLogP</small><b>${fmt(m.clogp, 2)}</b></div>
          <div><small>TPSA (Å²)</small><b>${fmt(m.tpsa, 0)}</b></div>
          <div><small>Donores / aceptores H</small><b>${m.hbd} / ${m.hba}</b></div>
          <div><small>pKa</small><b>${f.pka != null ? fmt(f.pka, 1) : '—'}</b></div>
        </div>
        <p class="nota">Lipinski: cumple ${lip}/4 reglas. TPSA &lt; 90 Å² favorece el paso al SNC. cLogP calculado (Crippen); geometría 3D de mínima energía con RDKit (ETKDGv3 + MMFF94s).</p>
        <div class="caja"><div class="titulo-caja">Relación estructura-actividad</div>${f.quimica}</div>`;
      cont.querySelector('[data-mol-hueco]').replaceWith(this.contMol);
      if (!this.visor) this.visor = new Molecula3D(this.contMol);
      this.visor.mostrar(m, { hidrogenos: this.hidrogenos, grupo: this.grupoQuim });
    } else if (p === 'dosis') {
      renderSimulador(cont, { farmaco: f, dosis: this.estado.dosis, opciones: this.estado.opciones, aplicado: this.estado.aplicado });
    } else if (p === 'claves') {
      cont.innerHTML = (cat.infografias || []).map((k) => this._info(k)).join('') || '<p>Sin infografías.</p>';
      this._montarInfografias(cont);
    }
  }

  refrescarDosis() {
    if (this.pestana !== 'dosis') return;
    const cont = this.raiz.querySelector('#contenido-pestana');
    if (cont) refrescarSimulador(cont, { farmaco: POR_ID[this.estado.farmaco], dosis: this.estado.dosis, opciones: this.estado.opciones });
  }

  _clic(e) {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.farmaco) { this.acciones.elegirFarmaco(t.dataset.farmaco); return; }
    if (t.dataset.pestana) { this.irAPestana(t.dataset.pestana); return; }
    if (t.dataset.accion === 'recorrido') { this.acciones.iniciarRecorrido(); return; }
    if (t.dataset.grupo !== undefined) {
      const i = +t.dataset.grupo;
      this.grupoQuim = this.grupoQuim === i ? null : i;
      for (const b of this.raiz.querySelectorAll('[data-grupo]')) b.setAttribute('aria-pressed', +b.dataset.grupo === this.grupoQuim);
      this.visor?.mostrar(this.moleculas[this.estado.farmaco], { hidrogenos: this.hidrogenos, grupo: this.grupoQuim });
      return;
    }
    if (t.dataset.mol === 'h') {
      this.hidrogenos = !this.hidrogenos;
      t.setAttribute('aria-pressed', this.hidrogenos);
      this.visor?.mostrar(this.moleculas[this.estado.farmaco], { hidrogenos: this.hidrogenos, grupo: this.grupoQuim });
      return;
    }
    if (t.dataset.mol === 'giro') {
      const on = t.getAttribute('aria-pressed') !== 'true';
      t.setAttribute('aria-pressed', on);
      this.visor?.giro(on);
      return;
    }
    if (t.dataset.simSugerido) { this.acciones.opcion('comparar', t.dataset.simSugerido); this._pestana(); }
  }

  _entrada(e) {
    const t = e.target;
    if (t.dataset.sim === 'dosis') {
      const f = POR_ID[this.estado.farmaco];
      this.acciones.cambiarDosis(dosisDesdeSlider(f, +t.value));
    } else if (t.dataset.sim === 'ph') {
      this.acciones.opcion('pH', +t.value / 10);
      this._pestana();
    }
  }

  _cambio(e) {
    const t = e.target;
    if (t.dataset.sim === 'naloxona') { this.acciones.opcion('naloxona', t.checked); this._pestana(); }
    if (t.dataset.sim === 'comparar') { this.acciones.opcion('comparar', t.value || null); this._pestana(); }
  }

  reiniciarQuimica() { this.grupoQuim = null; }
}
