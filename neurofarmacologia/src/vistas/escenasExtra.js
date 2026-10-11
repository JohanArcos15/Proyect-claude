// Escenas moleculares adicionales: canales del axón, COX, placa motora e
// hígado. Misma interfaz que la sinapsis química: paso(dt, e) y dibujar(ctx, e).
import { IONES, NT, COLOR_FARMACO, COLOR_FARMACO_HALO } from '../datos/neurotransmisores.js';
import { TINTA, FUENTE, rgba, mezcla, rrect, brillo, circulo, hexagono, bicapa, bezier, rotulo, pildora, flecha, gauss } from '../util/dibujo.js';

const W = 800, H = 500;

function hexFarmaco(ctx, x, y, r, rot, { carga = false, contorno = false, alfa = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alfa;
  brillo(ctx, x, y, r * 2.3, COLOR_FARMACO_HALO, 0.7);
  hexagono(ctx, x, y, r, rot);
  if (contorno) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.strokeStyle = COLOR_FARMACO;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  } else {
    ctx.fillStyle = COLOR_FARMACO;
    ctx.fill();
    ctx.strokeStyle = '#1a2233';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  if (carga) rotulo(ctx, '+', x + r + 3, y - r, { tam: 10, color: '#ffe7a3', peso: 700 });
  ctx.restore();
}

function titulo(ctx, texto, sub) {
  rotulo(ctx, texto, 16, 18, { tam: 12.5, color: TINTA.texto, alinear: 'left', peso: 700, fuente: FUENTE.titulo });
  if (sub) rotulo(ctx, sub, 16, 36, { tam: 10.5, color: TINTA.suave, alinear: 'left' });
}

// ============================================================================
// Membrana del axón: canales de Na⁺ (o Ca²⁺ tipo T) dependientes de voltaje
// ============================================================================
export class EscenaAxon {
  constructor(cfg, rnd) {
    this.cfg = cfg;
    this.rnd = rnd;
    this.t = 0;
    this.yM = 236;
    this.ion = cfg.canal === 'CavT' ? 'Ca' : 'Na';
    this.canales = [120, 260, 400, 540, 680].map((x) => ({ x, estado: 'cerrado', t: 0, unido: null, lenta: 0 }));
    this.ondas = [];
    this.proxima = 0.4;
    this.iones = [];
    this.farmacos = [];
    this.disparos = 0;
    this.exitos = 0;
    this.historial = [];
  }

  fraccionNeutra(pH) {
    const pKa = this.cfg.pKa ?? 7.9;
    return 1 / (1 + Math.pow(10, pKa - pH));
  }

  paso(dt, e) {
    this.t += dt;
    const r = this.rnd;
    const cfg = this.cfg;
    const alta = !!e.frecuenciaAlta;
    const periodo = alta ? 0.42 : 1.7;
    const occ = e.farmaco * e.efecto;
    const modo = cfg.modo;
    this.proxima -= dt;
    if (this.proxima <= 0) {
      this.proxima = periodo;
      this.ondas.push({ x: -20, amp: 1, viva: true });
      this.disparos++;
    }
    // propagación: el frente se apaga si los canales que encuentra no pueden abrirse
    for (const o of this.ondas) {
      const antes = o.x;
      o.x += dt * 520;
      for (const c of this.canales) {
        if (antes < c.x && o.x >= c.x && o.viva) {
          if (c.estado === 'cerrado' && !(c.unido && c.unido.bloquea)) {
            c.estado = 'abierto'; c.t = 0;
            for (let i = 0; i < 5; i++) this._ion(c.x, i * 0.025);
            o.amp = Math.min(1, o.amp + 0.25);
          } else {
            o.amp *= 0.42;
            if (o.amp < 0.3) o.viva = false;
          }
        }
      }
      if (o.x > 800 && o.viva) { this.exitos++; o.viva = false; o.llego = true; }
    }
    this.ondas = this.ondas.filter((o) => o.x < 860 && (o.viva || o.amp > 0.02));
    for (const o of this.ondas) if (!o.viva) o.amp *= Math.exp(-dt * 6);
    // ventana móvil de conducción
    this.historial.push(...this.ondas.filter((o) => o.llego && !o.contada).map((o) => { o.contada = true; return 1; }));
    // ciclo de cada canal
    for (const c of this.canales) {
      c.t += dt;
      if (c.estado === 'abierto' && c.t > 0.09) { c.estado = 'inactivado'; c.t = 0; }
      else if (c.estado === 'inactivado') {
        // los antiepilépticos se unen preferentemente al estado inactivado
        if (modo === 'uso-dependiente' && !c.unido && r() < occ * dt * 9) c.unido = { t: 0, bloquea: true, dur: 0.9 + r() * 1.4 };
        if (modo === 'inactivacion-lenta' && !c.unido && r() < occ * dt * 2.4) c.unido = { t: 0, bloquea: true, dur: 2.5 + r() * 2, lenta: true };
        const rec = 0.32;
        if (c.t > rec && !(c.unido && (modo === 'uso-dependiente' || modo === 'inactivacion-lenta'))) { c.estado = 'cerrado'; c.t = 0; }
      }
      if (c.unido) {
        c.unido.t += dt;
        if (c.unido.t > c.unido.dur) {
          if (modo === 'anestesico-local' && r() < 0.5 * (1 - occ * 0.6)) { this._soltar(c); }
          else if (modo !== 'anestesico-local') { this._soltar(c); if (c.estado === 'inactivado') { c.estado = 'cerrado'; c.t = 0; } }
          else c.unido.t = 0;
        }
      }
      c.lenta += ((c.unido?.lenta ? 1 : 0) - c.lenta) * Math.min(1, dt * 3);
    }
    // anestésico local: B atraviesa la membrana, BH⁺ bloquea desde dentro
    if (modo === 'anestesico-local' || modo === 'bloqueo-T') this._pasoFarmacoLocal(dt, e, occ);
    for (const io of this.iones) {
      io.t += dt;
      if (io.t < 0) continue;
      const k = Math.min(1, io.t / 0.6);
      io.y = io.y0 + (io.y1 - io.y0) * k * k * (3 - 2 * k);
      io.x = io.x0 + Math.sin(io.t * 10 + io.f) * 2 + io.dx * k;
    }
    this.iones = this.iones.filter((io) => io.t < 0.6);
  }

  _soltar(c) {
    if (c.unido?.particula) { c.unido.particula.estado = 'libre'; c.unido.particula.vy = 40; }
    c.unido = null;
  }

  _ion(x, retardo) {
    this.iones.push({ x0: x + (this.rnd() - 0.5) * 6, x, y0: this.yM - 60, y1: this.yM + 70, y: this.yM - 60, t: -retardo, f: this.rnd() * 6, dx: (this.rnd() - 0.5) * 40 });
  }

  _pasoFarmacoLocal(dt, e, occ) {
    const r = this.rnd;
    const pH = e.pH ?? 7.4;
    const fn = this.fraccionNeutra(pH);
    const objetivo = Math.round(e.farmaco * 16);
    const vivos = this.farmacos.filter((d) => !d.saliendo);
    if (vivos.length < objetivo && r() < dt * 8) {
      const neutra = r() < (this.cfg.modo === 'bloqueo-T' ? 1 : fn);
      this.farmacos.push({ x: 40 + r() * 720, y: 60 + r() * 40, vx: 0, vy: 30, neutra, lado: 'fuera', rot: r() * 6, estado: 'libre', alfa: 0 });
    } else if (vivos.length > objetivo && r() < dt * 5) {
      const d = vivos[0];
      d.saliendo = true;
      for (const c of this.canales) if (c.unido?.particula === d) this._soltar(c);
    }
    const yM = this.yM;
    for (const d of this.farmacos) {
      d.rot += dt * 0.7;
      d.alfa = Math.min(1, d.alfa + dt * 2) * (d.saliendo ? 0.96 : 1);
      if (d.estado === 'unido') { d.x += (d.cx - d.x) * dt * 8; d.y += (d.cy - d.y) * dt * 8; continue; }
      d.vx += gauss(r) * 120 * dt; d.vy += gauss(r) * 120 * dt + 10 * dt;
      d.vx *= 1 - 1.8 * dt; d.vy *= 1 - 1.8 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.x = Math.max(20, Math.min(780, d.x));
      if (d.lado === 'fuera') {
        if (d.y < 50) { d.y = 50; d.vy = Math.abs(d.vy); }
        if (d.y > yM - 14) {
          if (d.neutra && r() < 0.5) { d.lado = 'membrana'; d.vy = 18; }
          else { d.y = yM - 14; d.vy = -Math.abs(d.vy); }
        }
        // reequilibrio ácido-base fuera de la célula
        if (r() < dt * 0.8) d.neutra = this.cfg.modo === 'bloqueo-T' ? true : r() < fn;
      } else if (d.lado === 'membrana') {
        d.vy = 22; d.vx *= 0.5;
        if (d.y > yM + 12) { d.lado = 'dentro'; d.neutra = r() < this.fraccionNeutra(7.2) * 0.5; }
      } else {
        if (d.y < yM + 14) { d.y = yM + 14; d.vy = Math.abs(d.vy); }
        if (d.y > 470) { d.y = 470; d.vy = -Math.abs(d.vy); }
        if (r() < dt * 0.8) d.neutra = r() < this.fraccionNeutra(7.2) * 0.5;
        // la forma ionizada entra al poro por dentro cuando el canal está abierto o inactivado
        if (!d.neutra || this.cfg.modo === 'bloqueo-T') {
          const c = this.canales.find((cc) => !cc.unido && (cc.estado !== 'cerrado' || this.cfg.modo === 'bloqueo-T') && Math.abs(cc.x - d.x) < 90);
          const quiere = this.canales.filter((cc) => cc.unido).length / this.canales.length < occ * 1.1;
          if (c && quiere) {
            d.vx += (c.x - d.x) * 3 * dt; d.vy += (yM + 6 - d.y) * 3 * dt;
            if (Math.hypot(c.x - d.x, yM + 6 - d.y) < 14) {
              d.estado = 'unido'; d.cx = c.x; d.cy = yM + 4;
              c.unido = { t: 0, bloquea: true, dur: 2 + r() * 3, particula: d };
            }
          }
        }
      }
    }
    this.farmacos = this.farmacos.filter((d) => !(d.saliendo && d.alfa < 0.05));
  }

  dibujar(ctx, e) {
    const cfg = this.cfg;
    const yM = this.yM;
    const colIon = IONES[this.ion].color;
    // espacios
    const gFuera = ctx.createLinearGradient(0, 0, 0, yM);
    gFuera.addColorStop(0, 'rgba(255,181,71,0.03)');
    gFuera.addColorStop(1, 'rgba(255,181,71,0.08)');
    ctx.fillStyle = gFuera;
    ctx.fillRect(0, 0, W, yM);
    ctx.fillStyle = 'rgba(90,110,170,0.12)';
    ctx.fillRect(0, yM, W, H - yM);
    titulo(ctx, cfg.canal === 'CavT' ? 'Neurona talámica · canales de Ca²⁺ tipo T (CaV3)' : 'Membrana del axón · canales de Na⁺ dependientes de voltaje', cfg.subtitulo);
    rotulo(ctx, 'Exterior', 784, 66, { tam: 10.5, color: TINTA.suave, alinear: 'right' });
    rotulo(ctx, 'Interior (axoplasma)', 784, 470, { tam: 10.5, color: TINTA.suave, alinear: 'right' });
    // iones de fondo
    const r = this.t;
    for (let i = 0; i < 26; i++) {
      const x = (i * 97 + 30) % 780 + 10, y = 70 + ((i * 53) % 120);
      circulo(ctx, x + Math.sin(r * 0.7 + i) * 4, y + Math.cos(r * 0.5 + i) * 4, 2.2, rgba(colIon, 0.45));
    }
    // ondas de despolarización sobre la membrana
    for (const o of this.ondas) {
      if (o.amp < 0.03) continue;
      const g = ctx.createRadialGradient(o.x, yM, 0, o.x, yM, 90);
      g.addColorStop(0, `rgba(255,190,110,${0.5 * o.amp})`);
      g.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(o.x - 90, yM - 60, 180, 120);
    }
    const pts = [];
    for (let x = -10; x <= 810; x += 10) pts.push([x, yM]);
    bicapa(ctx, pts, { grosor: 18, huecos: this.canales.map((c) => [c.x - 22, c.x + 22]) });
    // canales
    for (const c of this.canales) this._canal(ctx, c, colIon);
    // iones que entran
    for (const io of this.iones) {
      if (io.t < 0) continue;
      brillo(ctx, io.x, io.y, 7, colIon, 0.8);
      circulo(ctx, io.x, io.y, 2.8, colIon);
    }
    for (const d of this.farmacos) hexFarmaco(ctx, d.x, d.y, 6, d.rot, { carga: !d.neutra, contorno: d.neutra, alfa: d.alfa });
    // leyenda de estados
    const ley = [['Cerrado', '#56607a'], ['Abierto', colIon], ['Inactivado', '#8a6fd1'], ['Bloqueado', COLOR_FARMACO_HALO]];
    ley.forEach(([t, c], i) => {
      circulo(ctx, 22 + i * 96, 398, 5, c);
      rotulo(ctx, t, 32 + i * 96, 398, { tam: 10, color: TINTA.suave, alinear: 'left' });
    });
    // panel de información
    const disponibles = this.canales.filter((c) => !c.unido).length;
    rotulo(ctx, `Canales disponibles: ${disponibles}/${this.canales.length}`, 16, 428, { tam: 11, color: TINTA.texto, alinear: 'left', fuente: FUENTE.mono });
    const llegan = this.ondas.filter((o) => o.viva).length;
    if (cfg.modo === 'anestesico-local') {
      const pH = e.pH ?? 7.4;
      const fn = this.fraccionNeutra(pH);
      rotulo(ctx, `pH ${pH.toFixed(1)} · pKa ${(cfg.pKa ?? 7.9).toFixed(1)} → forma no ionizada (B): ${(fn * 100).toFixed(0)} %`, 16, 450, { tam: 11, color: '#ffe7a3', alinear: 'left', fuente: FUENTE.mono });
      rotulo(ctx, 'B (contorno) cruza la membrana · BH⁺ (relleno, +) bloquea el canal desde dentro', 16, 470, { tam: 10, color: TINTA.suave, alinear: 'left' });
    } else if (cfg.modo === 'uso-dependiente' || cfg.modo === 'inactivacion-lenta') {
      rotulo(ctx, e.frecuenciaAlta ? 'Descarga de alta frecuencia (como en una crisis)' : 'Disparo a frecuencia normal', 16, 450, { tam: 11, color: e.frecuenciaAlta ? '#ffb27a' : '#9fd8ff', alinear: 'left' });
      rotulo(ctx, cfg.modo === 'inactivacion-lenta' ? 'El fármaco favorece la inactivación LENTA: el canal tarda segundos en recuperarse' : 'El fármaco se une al estado inactivado: cuanto más dispara la neurona, más canales bloquea', 16, 470, { tam: 10, color: TINTA.suave, alinear: 'left' });
    }
    // indicador de conducción
    const ok = this.ondas.some((o) => o.viva && o.x > 700);
    pildora(ctx, ok ? '✓ El impulso llega al final' : (this.ondas.some((o) => !o.viva && o.amp > 0.05) ? '✕ El impulso se extingue' : 'Impulso en tránsito'), 690, 398, { tam: 10.5, color: ok ? '#bff5d6' : '#ffd0c8' });
  }

  _canal(ctx, c, colIon) {
    const x = c.x, y = this.yM;
    const abierto = c.estado === 'abierto';
    const inact = c.estado === 'inactivado' || c.lenta > 0.3;
    const sep = abierto ? 6 : 2;
    const base = c.unido ? '#6b6250' : abierto ? mezcla('#5b4a2c', colIon, 0.55) : inact ? '#4d3f78' : '#3c465e';
    ctx.save();
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(x + s * sep, y);
      ctx.beginPath();
      const w = 17;
      ctx.moveTo(0, -30);
      ctx.bezierCurveTo(s * (w + 6), -36, s * (w + 4), -16, s * w, -10);
      ctx.lineTo(s * w, 22);
      ctx.quadraticCurveTo(s * w, 30, s * 6, 30);
      ctx.lineTo(0, 26);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -36, 0, 30);
      g.addColorStop(0, mezcla(base, '#ffffff', 0.15));
      g.addColorStop(1, mezcla(base, '#000000', 0.3));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.stroke();
      ctx.restore();
    }
    // compuerta de activación (arriba)
    ctx.strokeStyle = abierto || inact ? 'rgba(255,255,255,0.25)' : '#c9d3e6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (abierto || inact) { ctx.moveTo(x - 8, y - 28); ctx.lineTo(x - 14, y - 40); } else { ctx.moveTo(x - 7, y - 26); ctx.lineTo(x + 7, y - 26); }
    ctx.stroke();
    // compuerta de inactivación (bola y cadena, abajo)
    const bolaY = inact ? y + 30 : y + 52;
    const bolaX = inact ? x : x + 20;
    ctx.strokeStyle = '#8a6fd1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 28);
    ctx.quadraticCurveTo(x + 24, y + 44, bolaX, bolaY);
    ctx.stroke();
    circulo(ctx, bolaX, bolaY, inact ? 6.5 : 5.5, '#8a6fd1', '#c9b8ff', 1);
    if (c.lenta > 0.3) rotulo(ctx, 'lenta', x, y + 46, { tam: 8.5, color: '#c9b8ff' });
    if (abierto) brillo(ctx, x, y, 22, colIon, 0.7);
    if (c.unido && !c.unido.particula) hexFarmaco(ctx, x, y + 4, 5.5, 0);
    ctx.restore();
  }
}

// ============================================================================
// Inflamación y COX: de los fosfolípidos a la prostaglandina y al nociceptor
// ============================================================================
export class EscenaCox {
  constructor(cfg, rnd) {
    this.cfg = cfg;
    this.rnd = rnd;
    this.t = 0;
    this.aa = [];
    this.pg = [];
    this.farmacos = [];
    this.cox = [
      { id: 'COX-1', x: 190, y: 250, color: '#7fb6ff', bloqueo: 0, acetilada: 0, produce: 0 },
      { id: 'COX-2', x: 350, y: 250, color: '#ff9e80', bloqueo: 0, acetilada: 0, produce: 0 },
    ];
    this.picos = [];
    this.sens = 0;
    this.tPico = 0;
  }

  paso(dt, e) {
    this.t += dt;
    const r = this.rnd;
    const cfg = this.cfg;
    const occ = e.farmaco * e.efecto;
    const sel = cfg.seleccion || 'no-selectivo';
    // fármaco unido a cada COX (fracción)
    for (const c of this.cox) {
      let objetivo = occ;
      if (sel === 'cox2' && c.id === 'COX-1') objetivo = occ * 0.12;
      if (sel === 'debil') objetivo = occ * 0.35;
      c.bloqueo += (objetivo - c.bloqueo) * Math.min(1, dt * 3);
      if (cfg.irreversible) c.acetilada = Math.max(c.acetilada, c.bloqueo * 0.95);
    }
    // ácido araquidónico liberado por la PLA2
    if (r() < dt * 9) this.aa.push({ x: 120 + r() * 300, y: 132, vx: 0, vy: 30, destino: r() < 0.45 ? 0 : 1, t: 0 });
    for (const p of this.aa) {
      const c = this.cox[p.destino];
      p.t += dt;
      p.vx += ((c.x - p.x) * 1.6 - p.vx * 1.4) * dt + gauss(r) * 40 * dt;
      p.vy += ((c.y - 42 - p.y) * 1.6 - p.vy * 1.4) * dt + gauss(r) * 40 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (Math.hypot(p.x - c.x, p.y - (c.y - 42)) < 10) {
        const bloq = Math.max(c.bloqueo, c.acetilada);
        if (r() > bloq) {
          c.produce = 1;
          // COX-1 → tromboxano / PG protectoras; COX-2 → PGE₂ inflamatoria
          if (c.id === 'COX-2' || r() < 0.4) this.pg.push({ x: c.x, y: c.y + 40, vx: 40 + r() * 40, vy: 10 + r() * 30, t: 0, inflam: true });
          else this.pg.push({ x: c.x, y: c.y + 40, vx: -30 - r() * 30, vy: 40 + r() * 20, t: 0, inflam: false });
        }
        p.fuera = true;
      }
      if (p.t > 4) p.fuera = true;
    }
    this.aa = this.aa.filter((p) => !p.fuera);
    for (const c of this.cox) c.produce = Math.max(0, c.produce - dt * 2);
    // prostaglandinas que difunden: inflamatorias → nociceptor; protectoras → abajo
    let enNoci = 0;
    for (const p of this.pg) {
      p.t += dt;
      p.vx += gauss(r) * 80 * dt; p.vy += gauss(r) * 80 * dt;
      if (p.inflam) p.vx += 60 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.inflam && p.x > 560) enNoci++;
    }
    this.pg = this.pg.filter((p) => p.t < 3.5 && p.x < 800 && p.y < 500);
    // sensibilización del nociceptor ∝ PGE₂ disponible
    this.sens += (Math.min(1, enNoci / 10) - this.sens) * Math.min(1, dt * 1.2);
    const tasa = 0.6 + 7 * this.sens;
    this.tPico -= dt;
    if (this.tPico <= 0) { this.tPico = (1 / tasa) * (0.6 + r() * 0.8); this.picos.push({ u: 0 }); }
    for (const p of this.picos) p.u += dt * 0.9;
    this.picos = this.picos.filter((p) => p.u < 1);
    // fármaco visible
    const objetivoN = Math.round(e.farmaco * 10);
    if (this.farmacos.length < objetivoN && r() < dt * 6) this.farmacos.push({ x: 60 + r() * 380, y: 470, vx: 0, vy: -30, rot: r() * 6, t: 0 });
    if (this.farmacos.length > objetivoN && r() < dt * 6) this.farmacos.shift();
    for (const d of this.farmacos) {
      d.t += dt; d.rot += dt * 0.6;
      const objetivo = this.cox[sel === 'cox2' ? 1 : (this.farmacos.indexOf(d) % 2)];
      d.vx += ((objetivo.x - d.x) * 0.6 - d.vx) * dt + gauss(r) * 60 * dt;
      d.vy += ((objetivo.y - 42 - d.y) * 0.6 - d.vy) * dt + gauss(r) * 60 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
    }
  }

  dibujar(ctx, e) {
    const cfg = this.cfg;
    titulo(ctx, 'Inflamación periférica · ciclooxigenasa (COX) y nociceptor', cfg.subtitulo || 'Las prostaglandinas no causan dolor por sí solas: bajan el umbral del nociceptor (sensibilización)');
    // membrana de la célula dañada
    const mem = [];
    for (let x = 40; x <= 470; x += 10) mem.push([x, 120 + Math.sin(x / 40) * 3]);
    bicapa(ctx, mem, { grosor: 14 });
    rotulo(ctx, 'Membrana de la célula dañada (fosfolípidos)', 46, 96, { tam: 10.5, color: TINTA.suave, alinear: 'left' });
    rrect(ctx, 236, 110, 40, 22, 8);
    ctx.fillStyle = '#4b5f7d';
    ctx.fill();
    rotulo(ctx, 'PLA₂', 256, 121, { tam: 9.5, color: '#e6ecf5', peso: 700 });
    // ácido araquidónico
    for (const p of this.aa) {
      ctx.strokeStyle = '#f0d68a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) ctx.lineTo(p.x - 8 + i * 4, p.y + (i % 2 ? 2.5 : -2.5));
      ctx.stroke();
    }
    rotulo(ctx, 'Ácido araquidónico', 476, 170, { tam: 10, color: '#f0d68a', alinear: 'left' });
    // enzimas COX
    for (const c of this.cox) {
      const bloq = Math.max(c.bloqueo, c.acetilada);
      ctx.save();
      rrect(ctx, c.x - 48, c.y - 40, 96, 80, 26);
      const g = ctx.createLinearGradient(0, c.y - 40, 0, c.y + 40);
      g.addColorStop(0, mezcla(c.color, '#1a2233', 0.45 + 0.35 * bloq));
      g.addColorStop(1, mezcla(c.color, '#05070c', 0.7));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(c.color, 0.7 - 0.4 * bloq);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // canal hidrofóbico donde entra el ácido araquidónico
      rrect(ctx, c.x - 7, c.y - 44, 14, 42, 6);
      ctx.fillStyle = '#05070c';
      ctx.fill();
      if (c.produce > 0) brillo(ctx, c.x, c.y, 50, c.color, c.produce * 0.6);
      if (bloq > 0.3) hexFarmaco(ctx, c.x, c.y - 26, 6.5, this.t * 0.4);
      if (c.acetilada > 0.3) rotulo(ctx, 'Ser530-acetilada', c.x, c.y + 54, { tam: 9, color: '#ffd0c8' });
      rotulo(ctx, c.id, c.x, c.y + 18, { tam: 12, color: '#e6ecf5', peso: 700, fuente: FUENTE.titulo });
      rotulo(ctx, c.id === 'COX-1' ? 'constitutiva' : 'inducible', c.x, c.y + 32, { tam: 9, color: TINTA.suave });
      ctx.restore();
    }
    for (const p of this.pg) {
      const col = p.inflam ? NT.PG.color : '#9fd8ff';
      brillo(ctx, p.x, p.y, 7, col, 0.6);
      circulo(ctx, p.x, p.y, 3, col);
    }
    for (const d of this.farmacos) hexFarmaco(ctx, d.x, d.y, 5.5, d.rot, { alfa: 0.9 });
    // funciones protectoras de COX-1
    const c1 = 1 - Math.max(this.cox[0].bloqueo, this.cox[0].acetilada);
    const filas = [
      ['Plaquetas · TXA₂ (agregación)', '↑ riesgo de sangrado'],
      ['Mucosa gástrica · PGE₂/PGI₂ (protección)', '↑ riesgo de úlcera'],
      ['Riñón · PG (flujo renal)', '↓ filtración, retención de Na⁺'],
    ];
    filas.forEach(([t, alerta], i) => {
      const y = 364 + i * 30;
      circulo(ctx, 52, y, 6, rgba('#9fd8ff', 0.25 + 0.75 * c1));
      rotulo(ctx, t, 66, y, { tam: 10.5, color: TINTA.texto, alinear: 'left' });
      if (c1 < 0.55) rotulo(ctx, alerta, 330, y, { tam: 10.5, color: '#ff9e80', alinear: 'left', peso: 700 });
    });
    rotulo(ctx, 'Funciones de la COX-1', 46, 338, { tam: 10.5, color: TINTA.suave, alinear: 'left' });
    // nociceptor
    ctx.save();
    const noci = [[800, 210], [700, 214], [620, 236], [588, 270], [612, 304], [690, 318], [800, 320]];
    ctx.beginPath();
    noci.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.fillStyle = 'rgba(255,143,61,0.08)';
    ctx.fill();
    bicapa(ctx, noci, { grosor: 12, color: '#ffc9a3', paso: 6 });
    rotulo(ctx, 'Terminal del nociceptor (fibra C)', 792, 196, { tam: 10.5, color: '#ffc9a3', alinear: 'right' });
    for (const [x, y] of [[610, 250], [602, 290]]) {
      rrect(ctx, x - 9, y - 7, 18, 14, 5);
      ctx.fillStyle = mezcla('#4a3d36', NT.PG.color, 0.3 + 0.6 * this.sens);
      ctx.fill();
    }
    rotulo(ctx, 'Receptor EP', 600, 336, { tam: 9.5, color: NT.PG.color });
    // impulsos hacia la médula
    for (const p of this.picos) {
      const x = 640 + p.u * 160;
      brillo(ctx, x, 266, 20, '#ffd28a', 1 - p.u * 0.6);
      circulo(ctx, x, 266, 3.5, '#ffe7c2');
    }
    const tasa = 0.6 + 7 * this.sens;
    rotulo(ctx, `Disparo: ${tasa.toFixed(1)} Hz`, 792, 346, { tam: 11, color: tasa > 4 ? '#ffb27a' : '#bff5d6', alinear: 'right', fuente: FUENTE.mono });
    rotulo(ctx, this.sens > 0.45 ? 'Nociceptor sensibilizado (umbral bajo)' : 'Umbral normal', 792, 364, { tam: 10, color: TINTA.suave, alinear: 'right' });
    ctx.restore();
  }
}

// ============================================================================
// Placa neuromuscular y acoplamiento excitación-contracción (RyR1)
// ============================================================================
export class EscenaPlaca {
  constructor(cfg, rnd) {
    this.cfg = cfg;
    this.rnd = rnd;
    this.t = 0;
    this.ach = [];
    this.receptores = [300, 400, 500].map((x) => ({ x, unido: 0, abierto: 0, farmaco: 0 }));
    this.proximo = 0.5;
    this.ca = [];
    this.contraccion = 0;
    this.dep = 0;
    this.inactivo = 0;
    this.temperatura = 37;
    this.co2 = 40;
    this.fasc = 0;
  }

  paso(dt, e) {
    this.t += dt;
    const r = this.rnd;
    const cfg = this.cfg;
    const occ = e.farmaco * e.efecto;
    const acc = cfg.accion; // 'antagonista-nic' | 'despolarizante' | 'ryr1' | null
    const hm = !!e.hipertermia;
    this.proximo -= dt;
    if (this.proximo <= 0) {
      this.proximo = 1.4;
      for (let i = 0; i < 26; i++) this.ach.push({ x: 360 + (r() - 0.5) * 120, y: 112, vx: (r() - 0.5) * 80, vy: 60 + r() * 50, t: 0 });
    }
    // ACh: la acetilcolinesterasa la hidroliza en la hendidura
    let abiertos = 0;
    for (const p of this.ach) {
      p.t += dt;
      p.vx += gauss(r) * 180 * dt; p.vy += gauss(r) * 180 * dt;
      p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y < 112) { p.y = 112; p.vy = Math.abs(p.vy); }
      if (p.y > 160) { p.y = 160; p.vy = -Math.abs(p.vy); }
      if (r() < dt * 2.4) p.hidrolizada = true;
    }
    this.ach = this.ach.filter((p) => !p.hidrolizada && p.t < 2);
    for (const rec of this.receptores) {
      rec.farmaco += ((acc === 'antagonista-nic' || acc === 'despolarizante' ? occ : 0) - rec.farmaco) * Math.min(1, dt * 1.5);
      const achCerca = this.ach.filter((p) => Math.abs(p.x - rec.x) < 22 && p.y > 140).length;
      let objetivo = Math.min(1, achCerca / 3);
      if (acc === 'antagonista-nic') objetivo *= 1 - rec.farmaco;
      if (acc === 'despolarizante') objetivo = Math.max(objetivo, rec.farmaco); // no la degrada la AChE
      rec.abierto += (objetivo - rec.abierto) * Math.min(1, dt * 8);
      abiertos += rec.abierto;
    }
    // despolarización de la placa; si es sostenida, los Nav del músculo se inactivan
    const dep = abiertos / 3;
    this.dep += (dep - this.dep) * Math.min(1, dt * 6);
    const sostenida = acc === 'despolarizante' ? occ * e.farmaco : 0;
    this.inactivo += ((sostenida > 0.5 ? 1 : 0) - this.inactivo) * Math.min(1, dt * 0.35);
    if (acc === 'despolarizante' && sostenida > 0.3 && this.inactivo < 0.6) this.fasc = Math.min(1, this.fasc + dt * 2); else this.fasc = Math.max(0, this.fasc - dt);
    let paMusculo = this.dep > 0.35 && this.inactivo < 0.6 ? 1 : 0;
    if (this.fasc > 0.2 && r() < dt * 8) paMusculo = 1;
    // RyR1 libera Ca²⁺ del retículo sarcoplásmico
    const dantro = acc === 'ryr1' ? occ : 0;
    let liberacion = paMusculo * (1 - 0.75 * dantro);
    const trigger = hm && (e.desencadenante ?? true);
    if (trigger) liberacion = Math.max(liberacion, 0.9 * Math.max(0, 1 - 1.25 * dantro));
    if (r() < liberacion * dt * 30) this.ca.push({ x: 600 + (r() - 0.5) * 80, y: 352, vx: (r() - 0.5) * 60, vy: 30 + r() * 30, t: 0 });
    for (const c of this.ca) { c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vx += gauss(r) * 60 * dt; }
    this.ca = this.ca.filter((c) => c.t < 1.2 && c.y < 480);
    const caLibre = Math.min(1, this.ca.length / 20);
    this.contraccion += (caLibre - this.contraccion) * Math.min(1, dt * 5);
    // hipertermia maligna: calor y CO₂ por hipermetabolismo
    const objT = trigger ? 37 + 4.5 * (1 - 0.95 * dantro) : 37;
    this.temperatura += (objT - this.temperatura) * Math.min(1, dt * 0.25);
    const objCO2 = trigger ? 40 + 45 * (1 - 0.95 * dantro) : 40;
    this.co2 += (objCO2 - this.co2) * Math.min(1, dt * 0.4);
  }

  dibujar(ctx, e) {
    const cfg = this.cfg;
    titulo(ctx, 'Placa neuromuscular y acoplamiento excitación-contracción', cfg.subtitulo);
    // terminal motor
    const term = [[300, 30], [300, 50], ...bezier([300, 50], [240, 60], [230, 100], [280, 104]).slice(1), [440, 104], ...bezier([440, 104], [490, 100], [480, 60], [420, 50]).slice(1), [420, 30]];
    ctx.beginPath();
    term.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.fillStyle = 'rgba(63,214,155,0.08)';
    ctx.fill();
    bicapa(ctx, term, { grosor: 12, paso: 6 });
    rotulo(ctx, 'Motoneurona', 470, 40, { tam: 10.5, color: TINTA.suave, alinear: 'left' });
    for (let i = 0; i < 6; i++) circulo(ctx, 300 + i * 22, 82, 8, 'rgba(20,28,44,0.9)', NT.ACH.color, 1.4);
    // sarcolema con pliegues
    const sar = [];
    for (let x = 20; x <= 780; x += 6) {
      let y = 176;
      if (x > 250 && x < 550) y += Math.max(0, Math.sin((x - 250) / 300 * Math.PI * 6)) * -0 + (Math.sin((x - 250) / 50 * Math.PI) > 0.6 ? 18 : 0);
      if (x > 640 && x < 660) y = 176;
      sar.push([x, y]);
    }
    bicapa(ctx, sar, { grosor: 12, huecos: this.receptores.map((r) => [r.x - 16, r.x + 16]).concat([[634, 666]]), paso: 6 });
    rotulo(ctx, 'Fibra muscular (sarcolema)', 26, 160, { tam: 10.5, color: TINTA.suave, alinear: 'left' });
    // AChE
    for (let i = 0; i < 7; i++) {
      const x = 270 + i * 40;
      ctx.strokeStyle = 'rgba(160,190,170,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 142); ctx.lineTo(x - 4, 136); ctx.moveTo(x, 142); ctx.lineTo(x + 4, 136); ctx.stroke();
    }
    rotulo(ctx, 'AChE', 556, 140, { tam: 9.5, color: '#a0beaa', alinear: 'left' });
    for (const p of this.ach) circulo(ctx, p.x, p.y, 3, NT.ACH.color);
    // receptores nicotínicos
    for (const rec of this.receptores) {
      const sep = 1.5 + rec.abierto * 4;
      for (const s of [-1, 1]) {
        rrect(ctx, rec.x + s * sep - (s < 0 ? 12 : 0), 160, 12, 34, 5);
        ctx.fillStyle = mezcla('#2f5a4e', NT.ACH.color, 0.2 + 0.6 * rec.abierto);
        ctx.fill();
      }
      if (rec.abierto > 0.2) brillo(ctx, rec.x, 186, 18, IONES.Na.color, rec.abierto * 0.7);
      if (rec.farmaco > 0.25) hexFarmaco(ctx, rec.x - 12, 156, 5.5, 0, { alfa: Math.min(1, rec.farmaco * 1.3) });
    }
    pildora(ctx, 'Receptor nicotínico (Nm)', 400, 214, { tam: 10 });
    // túbulo T, DHPR y RyR1
    ctx.fillStyle = 'rgba(90,110,170,0.18)';
    ctx.fillRect(642, 180, 16, 160);
    rotulo(ctx, 'Túbulo T', 672, 230, { tam: 10, color: TINTA.suave, alinear: 'left' });
    rrect(ctx, 520, 336, 260, 32, 14);
    ctx.fillStyle = 'rgba(255,111,145,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,111,145,0.5)';
    ctx.stroke();
    rotulo(ctx, 'Retículo sarcoplásmico (Ca²⁺)', 776, 384, { tam: 10, color: '#ffb0c2', alinear: 'right' });
    const dantro = this.cfg.accion === 'ryr1' ? e.farmaco * e.efecto : 0;
    rrect(ctx, 628, 322, 44, 18, 6);
    ctx.fillStyle = e.hipertermia ? '#7a3045' : '#5b3a52';
    ctx.fill();
    rotulo(ctx, e.hipertermia ? 'RyR1 mutado' : 'RyR1', 650, 331, { tam: 9, color: '#ffe0e8', peso: 700 });
    if (dantro > 0.2) hexFarmaco(ctx, 682, 330, 5.5, this.t * 0.5);
    for (const c of this.ca) { brillo(ctx, c.x, c.y, 6, IONES.Ca.color, 0.7); circulo(ctx, c.x, c.y, 2.4, IONES.Ca.color); }
    // sarcómero
    const k = this.contraccion;
    const cx = 230, y0 = 410;
    const media = 150 - k * 46;
    ctx.strokeStyle = '#c9d3e6';
    ctx.lineWidth = 3;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * media, y0 - 26); ctx.lineTo(cx + s * media, y0 + 26); ctx.stroke(); }
    for (let i = 0; i < 4; i++) {
      const y = y0 - 18 + i * 12;
      ctx.strokeStyle = '#7fb6ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - media, y); ctx.lineTo(cx - media + 100, y); ctx.moveTo(cx + media, y); ctx.lineTo(cx + media - 100, y); ctx.stroke();
      if (i < 3) { ctx.strokeStyle = '#ff9e80'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 60, y + 6); ctx.lineTo(cx + 60, y + 6); ctx.stroke(); }
    }
    rotulo(ctx, 'Sarcómero (actina · miosina)', cx, y0 + 44, { tam: 10, color: TINTA.suave });
    rotulo(ctx, this.inactivo > 0.6 ? 'Parálisis flácida (bloqueo despolarizante, fase I)' : k > 0.5 ? (e.hipertermia ? 'Contractura sostenida (rigidez)' : 'Contracción') : this.fasc > 0.2 ? 'Fasciculaciones' : 'Relajado', cx, y0 - 44, { tam: 11, color: k > 0.5 ? '#ffb27a' : '#bff5d6', peso: 700 });
    // monitor de hipertermia maligna
    if (e.hipertermia) {
      const x = 470, y = 400;
      rrect(ctx, x, y, 310, 82, 10);
      ctx.fillStyle = 'rgba(40,12,18,0.7)';
      ctx.fill();
      ctx.strokeStyle = '#7a3045';
      ctx.stroke();
      rotulo(ctx, 'Hipertermia maligna', x + 12, y + 16, { tam: 11.5, color: '#ffb0c2', alinear: 'left', peso: 700 });
      rotulo(ctx, `T° ${this.temperatura.toFixed(1)} °C`, x + 12, y + 42, { tam: 13, color: this.temperatura > 38.5 ? '#ff9e80' : '#bff5d6', alinear: 'left', fuente: FUENTE.mono });
      rotulo(ctx, `EtCO₂ ${this.co2.toFixed(0)} mmHg`, x + 150, y + 42, { tam: 13, color: this.co2 > 50 ? '#ff9e80' : '#bff5d6', alinear: 'left', fuente: FUENTE.mono });
      rotulo(ctx, dantro > 0.3 ? 'Dantroleno cierra el RyR1 → el Ca²⁺ vuelve al retículo' : 'Fuga masiva de Ca²⁺ → contractura, calor, CO₂ ↑, acidosis', x + 12, y + 66, { tam: 10, color: TINTA.suave, alinear: 'left' });
    }
  }
}

// ============================================================================
// Hígado: metabolismo del acetaminofén y antídoto (N-acetilcisteína)
// ============================================================================
export class EscenaHepatica {
  constructor(cfg, rnd) {
    this.cfg = cfg;
    this.rnd = rnd;
    this.t = 0;
    this.mol = [];
    this.gsh = 1;
    this.dano = 0;
  }

  paso(dt, e) {
    this.t += dt;
    const r = this.rnd;
    const dosis = e.dosisParacetamol ?? 1; // 1 = dosis terapéutica, >2,5 = sobredosis
    const nac = e.nac ?? e.farmaco; // presencia del antídoto
    if (r() < dt * (3 + 5 * Math.min(dosis, 4))) this.mol.push({ x: 60, y: 120 + r() * 260, ruta: null, t: 0, etapa: 0 });
    // saturación de la glucuronidación y la sulfatación con dosis altas
    const capacidad = 1 / Math.max(1, dosis / 1.4);
    for (const m of this.mol) {
      m.t += dt;
      if (m.ruta === null && m.x > 200) {
        const u = r();
        const pGlu = 0.58 * capacidad, pSul = 0.30 * capacidad;
        m.ruta = u < pGlu ? 'glu' : u < pGlu + pSul ? 'sul' : 'cyp';
      }
      const dest = { glu: [430, 130], sul: [430, 250], cyp: [430, 370] }[m.ruta] || [260, m.y];
      if (m.etapa === 0) {
        m.x += (dest[0] - m.x) * dt * 1.6 + 20 * dt; m.y += (dest[1] - m.y) * dt * 1.6;
        if (m.ruta && Math.hypot(dest[0] - m.x, dest[1] - m.y) < 12) m.etapa = 1;
      } else if (m.etapa === 1) {
        if (m.ruta === 'cyp') {
          // NAPQI: se conjuga con glutatión si queda; si no, daña proteínas
          if (this.gsh > 0.25) { this.gsh -= 0.012; m.ruta = 'mercap'; m.etapa = 2; }
          else { m.etapa = 3; this.dano = Math.min(1, this.dano + 0.01); }
        } else m.etapa = 2;
      } else if (m.etapa === 2) {
        m.x += 120 * dt;
      } else if (m.etapa === 3) {
        m.x += (560 - m.x) * dt; m.y += (420 - m.y) * dt; m.fin = m.t > 6;
      }
    }
    this.mol = this.mol.filter((m) => m.x < 800 && !m.fin);
    // regeneración de glutatión: basal y, con NAC, mucho mayor
    this.gsh = Math.min(1, this.gsh + dt * (0.008 + 0.09 * nac));
    if (this.gsh > 0.5) this.dano = Math.max(0, this.dano - dt * 0.004);
  }

  dibujar(ctx, e) {
    titulo(ctx, 'Hepatocito · metabolismo del acetaminofén (paracetamol)', 'La N-acetilcisteína repone el glutatión que neutraliza al metabolito tóxico NAPQI');
    rrect(ctx, 170, 70, 450, 400, 40);
    ctx.fillStyle = `rgba(${120 + 100 * this.dano},${110 - 60 * this.dano},${150 - 90 * this.dano},0.12)`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,184,232,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    rotulo(ctx, 'Sangre (sinusoide)', 24, 86, { tam: 10.5, color: TINTA.suave, alinear: 'left' });
    rotulo(ctx, 'Bilis / orina', 780, 86, { tam: 10.5, color: TINTA.suave, alinear: 'right' });
    const rutas = [
      ['UGT · glucuronidación', 130, '#7fb6ff', 'Glucurónido (inactivo)'],
      ['SULT · sulfatación', 250, '#3fd69b', 'Sulfato (inactivo)'],
      ['CYP2E1 · oxidación', 370, '#ff9e80', 'NAPQI + GSH → mercaptúrico'],
    ];
    for (const [t, y, c, prod] of rutas) {
      rrect(ctx, 380, y - 22, 100, 44, 14);
      ctx.fillStyle = rgba(c, 0.18);
      ctx.fill();
      ctx.strokeStyle = rgba(c, 0.7);
      ctx.stroke();
      rotulo(ctx, t.split(' · ')[0], 430, y - 4, { tam: 11, color: c, peso: 700 });
      rotulo(ctx, t.split(' · ')[1], 430, y + 11, { tam: 9, color: TINTA.suave });
      rotulo(ctx, prod, 630, y, { tam: 10, color: c, alinear: 'left' });
    }
    for (const m of this.mol) {
      const col = m.etapa === 3 ? '#ff4d4d' : m.ruta === 'cyp' ? '#ff9e80' : m.ruta === 'mercap' ? '#9fd8ff' : m.ruta === 'glu' ? '#7fb6ff' : m.ruta === 'sul' ? '#3fd69b' : '#ffffff';
      circulo(ctx, m.x, m.y, 3.4, col);
    }
    // glutatión
    const x = 200, y = 430, w = 160;
    rotulo(ctx, 'Reserva de glutatión (GSH)', x, y - 14, { tam: 10.5, color: TINTA.suave, alinear: 'left' });
    rrect(ctx, x, y, w, 12, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    rrect(ctx, x, y, w * this.gsh, 12, 6);
    ctx.fillStyle = this.gsh < 0.3 ? '#ff6b5e' : '#3fd69b';
    ctx.fill();
    if (this.dano > 0.05) {
      rotulo(ctx, 'NAPQI unido a proteínas → necrosis', 600, 446, { tam: 10.5, color: '#ff8f8f', peso: 700 });
      for (let i = 0; i < 10 * this.dano; i++) circulo(ctx, 480 + (i * 37) % 120, 400 + (i * 23) % 50, 5, 'rgba(255,60,60,0.35)');
    }
    if ((e.nac ?? e.farmaco) > 0.3) pildora(ctx, 'N-acetilcisteína: aporta cisteína → regenera GSH', 280, 470, { tam: 10, color: '#1a1f2c', fondo: COLOR_FARMACO_HALO, borde: COLOR_FARMACO_HALO });
  }
}
