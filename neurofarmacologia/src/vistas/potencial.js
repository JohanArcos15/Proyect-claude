// Osciloscopio de dos canales: la misma neurona, con las mismas entradas,
// sin fármaco (arriba) y con fármaco (abajo). Así cualquier diferencia se
// debe solo al fármaco.
import { Neurona, Axon, MOD_BASE } from '../util/neurona.js';
import { TINTA, FUENTE, rgba, rrect, rotulo, ajustarLienzo, aleatorio, pildora } from '../util/dibujo.js';
import { COLOR_FARMACO_HALO } from '../datos/neurotransmisores.js';

const DT = 0.025;

function poisson(r, l) {
  let k = 0, p = Math.exp(-l), s = p;
  const u = r();
  while (u > s) { k++; p *= l / k; s += p; }
  return k;
}

const PROTOCOLOS = {
  sinaptico: { ventana: 1000, velocidad: 0.42, tipo: 'cortical', titulo: 'Neurona cortical con entradas sinápticas (glutamato + GABA)' },
  tren: { ventana: 1200, velocidad: 0.34, tipo: 'cortical', titulo: 'Disparo normal (pulsos) y descarga sostenida de alta frecuencia', sincronizado: true },
  talamico: { ventana: 1000, velocidad: 0.4, tipo: 'talamica', titulo: 'Neurona tálamo-cortical: ráfagas de rebote a 3 Hz (como en las ausencias)', sincronizado: true },
  msn: { ventana: 1000, velocidad: 0.42, tipo: 'cortical', titulo: 'Neurona espinosa del estriado con receptores D2 (vía indirecta)' },
  nociceptor: { ventana: 1000, velocidad: 0.42, tipo: 'cortical', titulo: 'Nociceptor ante un estímulo doloroso repetido', sincronizado: true },
  placa: { ventana: 1000, velocidad: 0.42, tipo: 'cortical', titulo: 'Fibra muscular: potencial de placa y potencial de acción muscular', sincronizado: true },
  axon: { ventana: 24, velocidad: 0.012, tipo: 'axon', titulo: 'Propagación del impulso a lo largo de un axón', sincronizado: true },
  ninguno: { ventana: 1000, velocidad: 0.4, tipo: 'ninguno', titulo: '' },
};

export class Potencial {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.presencia = 0;
    this.objetivoPresencia = 0;
    this.cfg = { protocolo: 'sinaptico', mod: {}, nombre: '' };
    this.visible = true;
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(canvas);
    this._reiniciar();
    this.ultimo = performance.now();
    this._bucle = this._bucle.bind(this);
    requestAnimationFrame(this._bucle);
  }

  configurar(cfg) {
    const cambiaProtocolo = cfg.protocolo !== this.cfg.protocolo;
    this.cfg = { ...this.cfg, ...cfg };
    if (cambiaProtocolo) this._reiniciar();
  }

  aplicar(on) { this.objetivoPresencia = on ? 1 : 0; }

  _reiniciar() {
    const p = PROTOCOLOS[this.cfg.protocolo] || PROTOCOLOS.sinaptico;
    this.p = p;
    this.rnd = aleatorio(11);
    this.t = 0;
    const n = 600;
    this.trazas = [new Float32Array(n).fill(NaN), new Float32Array(n).fill(NaN)];
    this.eventos = [];
    this.estimulo = new Float32Array(n).fill(0);
    this.conduce = undefined;
    this.cicloIniciado = false;
    if (p.tipo === 'axon') {
      this.axones = [new Axon(64), new Axon(64)];
      this.mapas = [];
    } else if (p.tipo !== 'ninguno') {
      this.neuronas = [new Neurona(p.tipo), new Neurona(p.tipo)];
      // estabiliza en reposo
      for (let i = 0; i < 4000; i++) for (const nn of this.neuronas) nn.paso(DT, { exc: 0, inh: 0, nic: 0 }, MOD_BASE);
      for (const nn of this.neuronas) { nn.t = 0; nn.picos = []; }
    }
  }

  // moduladores efectivos para el canal con fármaco (interpolados por presencia)
  _modFarmaco() {
    const f = this.presencia;
    const m = { ...MOD_BASE };
    for (const [k, v] of Object.entries(this.cfg.mod || {})) {
      if (typeof v !== 'number' || !(k in MOD_BASE)) continue;
      m[k] = MOD_BASE[k] + (v - MOD_BASE[k]) * f;
    }
    return m;
  }

  _entradas(t) {
    const r = this.rnd;
    const proto = this.cfg.protocolo;
    const ent = { exc: 0, inh: 0, nic: 0, i: 0 };
    if (proto === 'sinaptico' || proto === 'msn') {
      ent.exc = poisson(r, (proto === 'msn' ? 560 : 500) * DT / 1000);
      ent.inh = poisson(r, 250 * DT / 1000);
      ent.u = r();
    } else if (proto === 'tren') {
      const c = t % 1200;
      if (c < 420 && c % 105 < 2) ent.i = 25;
      if (c > 520 && c < 1000) ent.i = 4;
    } else if (proto === 'talamico') {
      ent.inh = (t % 333.3) < DT ? 30 : 0;
    } else if (proto === 'nociceptor') {
      const c = t % 1000;
      ent.i = c > 150 && c < 750 ? 0.35 + 1.1 * Math.sin(((c - 150) / 600) * Math.PI) : 0;
      ent.exc = poisson(r, 60 * DT / 1000);
    } else if (proto === 'placa') {
      ent.nic = (t % 250) < DT ? 1 : 0;
    }
    return ent;
  }

  _avanzar(msSim) {
    const pasos = Math.max(1, Math.round(msSim / DT));
    const proto = this.cfg.protocolo;
    const modF = this._modFarmaco();
    const modC = { ...MOD_BASE, ...(this.cfg.modControl || {}) };
    const p = this.p;
    const n = this.trazas[0].length;
    if (p.tipo === 'ninguno') return;
    for (let k = 0; k < pasos; k++) {
      this.t += DT;
      const idx = Math.floor(((this.t % p.ventana) / p.ventana) * n);
      if (p.tipo === 'axon') {
        const c = this.t % p.ventana;
        const estim = c < 1;
        const bloqueo = modF.naBloqueo;
        this.axones[0].paso(DT, estim, 0, 26, 40);
        this.axones[1].paso(DT, estim, bloqueo, 26, 40);
        this.trazas[0][idx] = this.axones[0].V[54];
        this.trazas[1][idx] = this.axones[1].V[54];
        this.llega ||= [false, false];
        if (this.axones[0].V[54] > 0) this.llega[0] = true;
        if (this.axones[1].V[54] > 0) this.llega[1] = true;
        if (c < DT) { this.conduce = this.cicloIniciado ? [...this.llega] : this.conduce; this.cicloIniciado = true; this.llega = [false, false]; }
        this.estimulo[idx] = estim ? 1 : 0;
        continue;
      }
      const ent = this._entradas(this.t);
      // el canal control y el canal con fármaco reciben exactamente las mismas entradas
      const entF = { ...ent };
      if (ent.u !== undefined && ent.u > modF.excLiberacion) entF.exc = 0;
      if (ent.u !== undefined && ent.u > modC.excLiberacion) ent.exc = 0;
      this.trazas[0][idx] = this.neuronas[0].paso(DT, ent, modC);
      this.trazas[1][idx] = this.neuronas[1].paso(DT, entF, modF);
      this.estimulo[idx] = ent.i || (ent.inh && proto === 'talamico' ? -1 : 0) || (ent.nic ? 1 : 0);
      if (ent.exc) this.eventos.push({ t: this.t, tipo: 'exc' });
      if (ent.inh && proto !== 'talamico') this.eventos.push({ t: this.t, tipo: 'inh' });
    }
    const t0 = this.t - p.ventana;
    while (this.eventos.length && this.eventos[0].t < t0) this.eventos.shift();
    this.idx = Math.floor(((this.t % p.ventana) / p.ventana) * n);
  }

  _bucle(ahora) {
    requestAnimationFrame(this._bucle);
    const dt = Math.min(0.05, (ahora - this.ultimo) / 1000);
    this.ultimo = ahora;
    if (!this.visible || document.hidden || this.pausado) return;
    this.presencia += (this.objetivoPresencia - this.presencia) * Math.min(1, dt * 1.2);
    this._avanzar(dt * 1000 * this.p.velocidad);
    this._dibujar();
  }

  _dibujar() {
    const c = this.canvas;
    const r = c.getBoundingClientRect();
    if (r.width < 60 || r.height < 60) return;
    const dpr = ajustarLienzo(c, r.width, r.height);
    const ctx = this.ctx;
    const w = r.width, h = r.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = TINTA.fondo;
    ctx.fillRect(0, 0, w, h);
    const p = this.p;
    if (p.tipo === 'ninguno') {
      rotulo(ctx, this.cfg.nota || 'Este fármaco no actúa sobre la excitabilidad neuronal.', w / 2, h / 2, { tam: 13, color: TINTA.suave });
      return;
    }
    const pad = { l: 92, r: 72, t: 30, b: 26 };
    const alto = (h - pad.t - pad.b) / 2;
    rotulo(ctx, p.titulo, 14, 14, { tam: 11.5, color: TINTA.suave, alinear: 'left' });
    const etiquetas = [this.cfg.etiquetaControl || 'Sin fármaco', this.cfg.etiquetaFarmaco || (this.cfg.nombre ? `Con ${this.cfg.nombre}` : 'Con fármaco')];
    for (let canal = 0; canal < 2; canal++) {
      const y0 = pad.t + canal * alto;
      const x0 = pad.l, x1 = w - pad.r;
      // cuadrícula
      ctx.strokeStyle = 'rgba(34,48,74,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) { const x = x0 + ((x1 - x0) * i) / 10; ctx.moveTo(x, y0 + 4); ctx.lineTo(x, y0 + alto - 6); }
      ctx.stroke();
      const yDe = (v) => y0 + 6 + (1 - (v + 95) / 145) * (alto - 14);
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(147,161,184,0.35)';
      ctx.beginPath(); ctx.moveTo(x0, yDe(-70)); ctx.lineTo(x1, yDe(-70)); ctx.stroke();
      ctx.setLineDash([]);
      rotulo(ctx, '−70', x0 - 6, yDe(-70), { tam: 9, color: TINTA.tenue, alinear: 'right', fuente: FUENTE.mono });
      rotulo(ctx, '+40', x0 - 6, yDe(40), { tam: 9, color: TINTA.tenue, alinear: 'right', fuente: FUENTE.mono });
      const activo = canal === 1 && this.presencia > 0.05;
      const colTraza = canal === 0 ? '#c9d3e6' : activo ? COLOR_FARMACO_HALO : '#c9d3e6';
      // etiqueta del canal
      ctx.save();
      ctx.translate(16, y0 + alto / 2);
      ctx.rotate(-Math.PI / 2);
      rotulo(ctx, etiquetas[canal], 0, 0, { tam: 10.5, color: canal === 1 && activo ? COLOR_FARMACO_HALO : TINTA.suave, peso: 700 });
      ctx.restore();
      rotulo(ctx, 'mV', x0 - 6, y0 + 10, { tam: 9, color: TINTA.tenue, alinear: 'right' });
      // traza (barrido tipo monitor)
      const tr = this.trazas[canal];
      const n = tr.length;
      const hueco = 10;
      ctx.beginPath();
      let pluma = false;
      for (let i = 0; i < n; i++) {
        const v = tr[i];
        const dist = (i - this.idx + n) % n;
        if (Number.isNaN(v) || (dist > 0 && dist < hueco)) { pluma = false; continue; }
        const x = x0 + ((x1 - x0) * i) / (n - 1);
        const y = yDe(Math.max(-95, Math.min(50, v)));
        if (pluma) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pluma = true; }
      }
      ctx.strokeStyle = colTraza;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = rgba(colTraza, 0.6);
      ctx.shadowBlur = canal === 1 && activo ? 6 : 0;
      ctx.stroke();
      ctx.shadowBlur = 0;
      // punto del barrido
      const vi = tr[(this.idx - 1 + n) % n];
      if (!Number.isNaN(vi)) {
        const x = x0 + ((x1 - x0) * ((this.idx - 1 + n) % n)) / (n - 1);
        ctx.fillStyle = colTraza;
        ctx.beginPath(); ctx.arc(x, yDe(Math.max(-95, Math.min(50, vi))), 2.6, 0, Math.PI * 2); ctx.fill();
      }
      // axón coloreado por voltaje, con el segmento bloqueado y el electrodo
      if (p.tipo === 'axon') {
        const ax = this.axones[canal];
        const ya = y0 + 8, xa0 = x0 + 4, xa1 = x1 - 4;
        const paso = (xa1 - xa0) / ax.n;
        for (let i = 0; i < ax.n; i++) {
          const v = Math.max(0, Math.min(1, (ax.V[i] + 75) / 110));
          ctx.fillStyle = `rgb(${Math.round(40 + 215 * v)},${Math.round(70 + 150 * v)},${Math.round(140 - 40 * v)})`;
          ctx.fillRect(xa0 + i * paso, ya, paso + 0.5, 7);
        }
        if (canal === 1 && this.presencia > 0.05) {
          ctx.strokeStyle = rgba(COLOR_FARMACO_HALO, 0.9 * this.presencia);
          ctx.lineWidth = 1.5;
          rrect(ctx, xa0 + 26 * paso - 2, ya - 3, 15 * paso + 4, 13, 4);
          ctx.stroke();
          rotulo(ctx, 'anestésico local', xa0 + 33.5 * paso, ya + 20, { tam: 9, color: COLOR_FARMACO_HALO });
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(xa0 + 54.5 * paso, ya - 2); ctx.lineTo(xa0 + 54.5 * paso - 4, ya - 8); ctx.lineTo(xa0 + 54.5 * paso + 4, ya - 8); ctx.fill();
      }
      // frecuencia de disparo
      let txt;
      if (p.tipo === 'axon') {
        const r = this.conduce?.[canal];
        txt = r === undefined ? 'midiendo…' : r ? 'conduce' : 'bloqueado';
      } else {
        const hz = this.neuronas[canal].frecuencia(this.cfg.protocolo === 'talamico' ? 2000 : 1000);
        txt = `${hz.toFixed(0)} Hz`;
      }
      rotulo(ctx, txt, w - 12, y0 + alto / 2, { tam: 14, color: canal === 1 && activo ? COLOR_FARMACO_HALO : TINTA.texto, alinear: 'right', fuente: FUENTE.mono, peso: 600 });
      rotulo(ctx, p.tipo === 'axon' ? 'extremo' : 'disparo', w - 12, y0 + alto / 2 + 16, { tam: 9, color: TINTA.tenue, alinear: 'right' });
    }
    // eje de tiempo y estímulo
    const x0 = pad.l, x1 = w - pad.r, yb = h - pad.b + 6;
    if (p.sincronizado) {
      ctx.strokeStyle = 'rgba(255,210,138,0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      const n = this.estimulo.length;
      for (let i = 0; i < n; i++) {
        const x = x0 + ((x1 - x0) * i) / (n - 1);
        const s = this.estimulo[i];
        const y = yb + 6 - Math.max(-1, Math.min(1, s / 4)) * 6;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      rotulo(ctx, this.cfg.protocolo === 'talamico' ? 'IPSP reticular' : this.cfg.protocolo === 'placa' ? 'impulso motor' : this.cfg.protocolo === 'axon' ? 'estímulo' : 'estímulo', x0 - 6, yb + 6, { tam: 9, color: 'rgba(255,210,138,0.8)', alinear: 'right' });
    } else {
      for (const ev of this.eventos) {
        const fr = ((ev.t % p.ventana) / p.ventana);
        const x = x0 + (x1 - x0) * fr;
        ctx.fillStyle = ev.tipo === 'exc' ? 'rgba(255,143,61,0.5)' : 'rgba(77,163,255,0.6)';
        ctx.fillRect(x, ev.tipo === 'exc' ? yb : yb + 7, 1, 5);
      }
      rotulo(ctx, 'Glu', x0 - 6, yb + 2, { tam: 8.5, color: '#ff8f3d', alinear: 'right' });
      rotulo(ctx, 'GABA', x0 - 6, yb + 10, { tam: 8.5, color: '#4da3ff', alinear: 'right' });
    }
    const escala = p.tipo === 'axon' ? `${p.ventana} ms` : `${p.ventana / 1000} s`;
    rotulo(ctx, escala, w - 12, h - 10, { tam: 9, color: TINTA.tenue, alinear: 'right', fuente: FUENTE.mono });
    if (this.cfg.nota) pildora(ctx, this.cfg.nota, (x0 + x1) / 2, pad.t + alto, { tam: 10, color: '#dfe7f5', fondo: 'rgba(13,20,32,0.92)' });
  }
}
