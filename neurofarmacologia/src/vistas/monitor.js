// Monitor clínico: EEG sintético + matriz espectral de densidad (DSA), índice
// de profundidad tipo BIS e indicadores (conciencia, respiración, dolor…).
// Las señales son ILUSTRATIVAS: reproducen los patrones descritos en la
// literatura (p. ej. Purdon et al. 2015, Anesthesiology 123:937), no registros.
import { TINTA, FUENTE, rgba, rotulo, ajustarLienzo, aleatorio, gauss } from '../util/dibujo.js';

const FS = 128;
const BANDAS = [
  { id: 'delta', f: 1.4, bw: 0.9 },
  { id: 'theta', f: 6, bw: 1.6 },
  { id: 'alfa', f: 10, bw: 1.2 },
  { id: 'husos', f: 13, bw: 1 },
  { id: 'beta', f: 19, bw: 4 },
  { id: 'gamma', f: 38, bw: 6 },
];

class Resonador {
  constructor(f, bw) {
    const r = Math.exp((-Math.PI * bw) / FS);
    this.a1 = 2 * r * Math.cos((2 * Math.PI * f) / FS);
    this.a2 = -r * r;
    this.g = Math.sqrt(1 - r * r) * 0.9;
    this.y1 = 0; this.y2 = 0;
  }
  paso(x) {
    const y = this.a1 * this.y1 + this.a2 * this.y2 + this.g * x;
    this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const ar = re[i + k + len / 2], ai = im[i + k + len / 2];
        const tr = ar * wr - ai * wi, ti = ar * wi + ai * wr;
        re[i + k + len / 2] = re[i + k] - tr; im[i + k + len / 2] = im[i + k] - ti;
        re[i + k] += tr; im[i + k] += ti;
      }
    }
  }
}

function colorEspectro(v) {
  // v en 0..1 → azul oscuro, violeta, rojo, amarillo
  const p = [[7, 11, 19], [36, 30, 92], [120, 40, 140], [215, 60, 90], [255, 150, 60], [255, 235, 140]];
  const x = Math.max(0, Math.min(0.999, v)) * (p.length - 1);
  const i = Math.floor(x), t = x - i;
  const a = p[i], b = p[i + 1];
  return `rgb(${a[0] + (b[0] - a[0]) * t | 0},${a[1] + (b[1] - a[1]) * t | 0},${a[2] + (b[2] - a[2]) * t | 0})`;
}

export const EEG_DESPIERTO = { delta: 0.12, theta: 0.15, alfa: 0.55, husos: 0, beta: 0.32, gamma: 0.08, supresion: 0, puntaOnda: 0, polipuntas: 0, amp: 1 };

export class Monitor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rnd = aleatorio(21);
    this.res = BANDAS.map((b) => new Resonador(b.f, b.bw));
    this.objetivo = { ...EEG_DESPIERTO };
    this.estado = { ...EEG_DESPIERTO };
    this.buffer = new Float32Array(FS * 8).fill(0);
    this.pos = 0;
    this.acum = 0;
    this.columnas = [];
    this.indice = 95;
    this.indiceObjetivo = 95;
    this.t = 0;
    this.burst = 0;
    this.visible = true;
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(canvas);
    for (let i = 0; i < FS * 60; i++) { this._muestra(); if (i % (FS / 2) === 0 && i > 256) this._espectro(); }
    this.ultimo = performance.now();
    this._bucle = this._bucle.bind(this);
    requestAnimationFrame(this._bucle);
  }

  configurar(eeg, indice, etiqueta) {
    this.objetivo = { ...EEG_DESPIERTO, ...eeg };
    this.indiceObjetivo = indice;
    this.etiqueta = etiqueta;
  }

  _muestra() {
    const s = this.estado;
    const r = this.rnd;
    this.t += 1 / FS;
    let x = 0;
    BANDAS.forEach((b, i) => {
      let a = s[b.id] || 0;
      if (b.id === 'husos') a *= Math.max(0, Math.sin(this.t * 2 * Math.PI * 0.18)) ** 2 * 1.8;
      x += this.res[i].paso(gauss(r)) * a * (b.id === 'delta' ? 2.2 : b.id === 'gamma' ? 0.6 : 1);
    });
    // supresión de ráfagas: periodos casi isoeléctricos alternando con ráfagas
    if (s.supresion > 0.02) {
      this.burst -= 1 / FS;
      if (this.burst <= 0) this.burst = this.enRafaga ? (1 + 6 * s.supresion) * (0.6 + r()) : 0.6 + r() * 0.8, this.enRafaga = !this.enRafaga;
      x *= this.enRafaga ? 1.6 : 0.08;
    }
    // punta-onda a 3 Hz (ausencias)
    if (s.puntaOnda > 0.02) {
      const fase = (this.t * 3) % 1;
      const punta = Math.exp(-((fase - 0.08) ** 2) / 0.0006) * 3.2;
      const onda = -Math.sin(Math.PI * Math.min(1, Math.max(0, (fase - 0.15) / 0.75))) * 1.6;
      x = x * (1 - 0.6 * s.puntaOnda) + (punta + onda) * s.puntaOnda * 1.4;
    }
    // polipuntas (crisis tónico-clónica)
    if (s.polipuntas > 0.02) {
      const f = (this.t * 9) % 1;
      x += (Math.exp(-((f - 0.2) ** 2) / 0.002) * 2.4 - 0.4) * s.polipuntas * (0.6 + 0.6 * Math.sin(this.t * 1.7)) + gauss(r) * 0.4 * s.polipuntas;
    }
    x *= s.amp ?? 1;
    this.buffer[this.pos] = x;
    this.pos = (this.pos + 1) % this.buffer.length;
  }

  _espectro() {
    const n = 256;
    const re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = this.buffer[(this.pos - n + i + this.buffer.length) % this.buffer.length];
      re[i] = v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
    }
    fft(re, im);
    const col = [];
    for (let k = 1; k <= 60; k++) col.push(Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-3));
    this.columnas.push(col);
    if (this.columnas.length > 120) this.columnas.shift();
  }

  _bucle(ahora) {
    requestAnimationFrame(this._bucle);
    const dt = Math.min(0.05, (ahora - this.ultimo) / 1000);
    this.ultimo = ahora;
    if (!this.visible || document.hidden || this.pausado) return;
    const k = Math.min(1, dt * 0.8);
    for (const c of Object.keys(this.objetivo)) this.estado[c] += ((this.objetivo[c] ?? 0) - (this.estado[c] ?? 0)) * k;
    this.indice += (this.indiceObjetivo - this.indice) * Math.min(1, dt * 0.7);
    const n = Math.round(dt * FS);
    for (let i = 0; i < n; i++) this._muestra();
    this.acum += dt;
    if (this.acum > 0.5) { this.acum = 0; this._espectro(); }
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
    const derecha = 104;
    const x0 = 46, x1 = w - derecha - 10;
    const hEeg = (h - 34) * 0.48;
    // EEG
    rotulo(ctx, 'EEG frontal · 8 s', x0, 12, { tam: 10.5, color: TINTA.suave, alinear: 'left' });
    rotulo(ctx, 'ilustrativo', x1, 12, { tam: 9, color: TINTA.tenue, alinear: 'right' });
    const yc = 22 + hEeg / 2;
    ctx.strokeStyle = 'rgba(34,48,74,0.6)';
    ctx.beginPath(); ctx.moveTo(x0, yc); ctx.lineTo(x1, yc); ctx.stroke();
    ctx.beginPath();
    const N = this.buffer.length;
    for (let i = 0; i < N; i++) {
      const v = this.buffer[(this.pos + i) % N];
      const x = x0 + ((x1 - x0) * i) / (N - 1);
      const y = yc - Math.max(-1, Math.min(1, v / 4.2)) * (hEeg / 2 - 2);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = '#7fe0c0';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // DSA
    const yS = 30 + hEeg, hS = h - yS - 16;
    rotulo(ctx, 'Hz', x0 - 26, yS + hS / 2, { tam: 9, color: TINTA.tenue, alinear: 'right' });
    for (const f of [0, 10, 20, 30]) rotulo(ctx, String(f), x0 - 8, yS + hS - (f / 30) * hS, { tam: 9, color: TINTA.tenue, alinear: 'right', fuente: FUENTE.mono });
    const cols = this.columnas;
    const cw = (x1 - x0) / 120;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const x = x1 - (cols.length - i) * cw;
      for (let k = 0; k < 60; k++) {
        const v = (col[k] - 0.5) / 5.5;
        ctx.fillStyle = colorEspectro(v);
        ctx.fillRect(x, yS + hS - ((k + 1) / 60) * hS, cw + 0.6, hS / 60 + 0.6);
      }
    }
    rotulo(ctx, 'Espectrograma (DSA) · 60 s', x0, h - 5, { tam: 9, color: TINTA.tenue, alinear: 'left' });
    // índice
    const xi = w - derecha + 6;
    rotulo(ctx, 'Índice', xi + derecha / 2 - 8, 16, { tam: 10, color: TINTA.suave });
    rotulo(ctx, 'tipo BIS', xi + derecha / 2 - 8, 29, { tam: 8.5, color: TINTA.tenue });
    const v = Math.round(this.indice);
    const col = v > 80 ? '#7fe0c0' : v > 60 ? '#ffd24d' : v > 40 ? '#ff9e5a' : '#ff6b8b';
    rotulo(ctx, String(v), xi + derecha / 2 - 8, 60, { tam: 34, color: col, fuente: FUENTE.mono, peso: 600 });
    const bx = xi + 8, bw = derecha - 32, by = 86, bh = h - by - 34;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(bx + bw / 2 - 5, by, 10, bh);
    const zonas = [[100, 80, '#7fe0c0'], [80, 60, '#ffd24d'], [60, 40, '#ff9e5a'], [40, 0, '#ff6b8b']];
    for (const [a, b, cc] of zonas) {
      ctx.fillStyle = rgba(cc, 0.28);
      ctx.fillRect(bx + bw / 2 - 5, by + (1 - a / 100) * bh, 10, ((a - b) / 100) * bh);
    }
    const ym = by + (1 - v / 100) * bh;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(bx + bw / 2 + 8, ym); ctx.lineTo(bx + bw / 2 + 15, ym - 5); ctx.lineTo(bx + bw / 2 + 15, ym + 5); ctx.fill();
    rotulo(ctx, this.etiqueta || '', xi + derecha / 2 - 8, h - 14, { tam: 9.5, color: col, peso: 700 });
  }
}

// ---------------------------------------------------------------------------
// Del estado clínico (efectos 0..1) al patrón de EEG e índice
// estilo: 'gaba' | 'propofol' | 'ketamina' | 'dexmedetomidina' | 'opioide' |
//         'hipnotico' | 'antihistaminico' | 'neutro' | 'clozapina'
export function eegDesde(e, estilo = 'gaba', crisis = null) {
  const s = Math.max(e.sedacion || 0, 0);
  const hip = Math.max(e.hipnosis || 0, 0);
  const an = Math.max(e.anestesia || 0, 0);
  const eeg = { ...EEG_DESPIERTO };
  const prof = Math.max(s * 0.55, hip * 0.8, an);
  eeg.alfa = 0.55 * (1 - Math.min(1, s * 0.7 + hip));
  eeg.delta = 0.12 + 0.7 * hip + 0.6 * an;
  eeg.theta = 0.15 + 0.35 * s;
  if (estilo === 'gaba') { eeg.beta = 0.32 + 0.55 * Math.min(1, s * 1.4) * (1 - hip); }
  if (estilo === 'propofol') { eeg.alfa = 0.25 + 0.9 * hip * (1 - an * 0.8); eeg.beta = 0.32 * (1 - hip); eeg.delta = 0.15 + 0.8 * hip + 0.4 * an; }
  if (estilo === 'ketamina') { eeg.gamma = 0.08 + 0.7 * Math.max(s, hip); eeg.theta = 0.2 + 0.5 * hip; eeg.alfa *= 0.6; }
  if (estilo === 'dexmedetomidina' || estilo === 'hipnotico') { eeg.husos = 0.6 * Math.min(1, s + hip); eeg.beta = 0.2; }
  if (estilo === 'opioide') { eeg.delta = 0.12 + 0.6 * Math.max(s, hip) + 0.5 * an; eeg.beta = 0.25; }
  if (estilo === 'antihistaminico') { eeg.husos = 0.3 * s; eeg.theta += 0.2 * s; }
  if (estilo === 'clozapina') { eeg.delta += 0.3 * s; eeg.theta += 0.2 * s; }
  eeg.supresion = an > 0.82 ? Math.min(0.9, (an - 0.82) * 5) : 0;
  if (crisis) {
    if (crisis.tipo === 'ausencia') eeg.puntaOnda = crisis.nivel;
    else eeg.polipuntas = crisis.nivel;
  }
  let indice = 97 - 14 * s - 30 * hip - 25 * an;
  if (estilo === 'ketamina') indice = Math.max(indice, 70 - 15 * an);
  indice = Math.max(4, Math.min(98, indice));
  const etiqueta = indice > 80 ? 'Despierto' : indice > 60 ? 'Sedación' : indice > 40 ? 'Anestesia' : 'Muy profundo';
  return { eeg, indice, etiqueta, prof };
}
