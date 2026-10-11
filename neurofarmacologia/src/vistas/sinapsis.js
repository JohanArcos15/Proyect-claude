// Sinapsis animada (Canvas 2D). Simulación continua de partículas:
// potencial de acción → Ca²⁺ → exocitosis → difusión → unión al receptor →
// apertura del canal / activación de la proteína G → recaptación.
// El fármaco son hexágonos blancos que se unen a su sitio concreto.
import { NT, IONES, COLOR_FARMACO, COLOR_FARMACO_HALO } from '../datos/neurotransmisores.js';
import {
  TINTA, FUENTE, rgba, mezcla, rrect, brillo, circulo, hexagono, bicapa, bezier, rotulo, pildora, flecha,
  ajustarLienzo, aleatorio, gauss, escalaTexto,
} from '../util/dibujo.js';
import { EscenaAxon, EscenaCox, EscenaPlaca, EscenaHepatica } from './escenasExtra.js';

const W = 800, H = 500;
const MEMB = 16;

// ---- Geometría de la sinapsis química --------------------------------------
const PRE = [
  [352, -10], [352, 26],
  ...bezier([352, 26], [300, 60], [150, 70], [158, 140]).slice(1),
  ...bezier([158, 140], [162, 188], [205, 199], [262, 201]).slice(1),
  [400, 203], [538, 201],
  ...bezier([538, 201], [595, 199], [638, 188], [642, 140]).slice(1),
  ...bezier([642, 140], [650, 70], [500, 60], [448, 26]).slice(1),
  [448, -10],
];
const yPost = (x) => 266 + Math.pow((x - 400) / 360, 2) * 46;
const POST = [];
for (let x = 30; x <= 770; x += 10) POST.push([x, yPost(x)]);

// La hendidura está entre la cara interna de la membrana presináptica (≈211)
// y la cara externa de la postsináptica (≈258 en el centro)
const HENDIDURA = { y0: 212, y1: (x) => yPost(x) - 9 };

function dentroPre(x, y) {
  // aproximación: elipse del botón + axón
  if (y < 30) return x > 356 && x < 444;
  const cx = 400, cy = 128, rx = 236, ry = 66;
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1 && y < 193;
}

class EscenaQuimica {
  constructor(cfg, rnd) {
    this.cfg = cfg;
    this.rnd = rnd;
    this.nt = NT[cfg.nt] || NT.GLU;
    this.nt2 = cfg.nt2 ? NT[cfg.nt2] : null;
    this.t = 0;
    this.proximoPA = 0.6;
    this.paFase = -1;
    this.vesiculas = [];
    this.particulas = [];
    this.iones = [];
    this.farmacos = [];
    this.vm = [];
    this.vmActual = -70;
    this.ampc = 18;
    this.flujo = 0;
    this.pasos = cfg.pasos || false;
    // receptores postsinápticos
    const tipos = cfg.post || [];
    const xs = tipos.length > 1 ? [262, 400, 538] : [250, 400, 550];
    this.receptores = xs.map((x, i) => {
      const def = tipos.length > 1 ? tipos[i === 1 ? 1 : 0] : tipos[0];
      return this._receptor(def, x, yPost(x), false);
    });
    // receptor presináptico (heterorreceptor μ, autorreceptor α2/D2)
    this.receptorPre = cfg.pre?.receptor ? this._receptor({ ...cfg.pre.receptor, tipo: 'gpcr' }, 600, 176, true) : null;
    this.canalesCa = [300, 500].map((x) => ({ x, y: 203, abierto: 0, a2d: !!cfg.pre?.a2d }));
    this.transportador = cfg.pre?.transportador ? { x: 196, y: 186, nombre: cfg.pre.transportador, bloqueo: 0, captura: 0 } : null;
    this.glia = cfg.pre?.glia ? { enzima: cfg.pre.enzima, transp: cfg.pre.transportadorGlia } : null;
    this.difusa = cfg.fuente === 'difusa';
    if (this.difusa) this.canalesCa = [];
    else for (let i = 0; i < 14; i++) this._nuevaVesicula(i < 3 ? i : -1);
  }

  _receptor(def, x, y, pre) {
    const r = { def, x, y, pre, tipo: def.tipo, ortho: [], farmacoSitio: {}, abierto: 0, estadoAbierto: false, tEstado: 0, activacion: 0, gAlfa: 0, gbg: 0, girk: 0, unionNT: 0 };
    if (def.tipo === 'canal') r.ortho = [{ dx: -15, dy: -26, nt: null, t: 0 }, { dx: 15, dy: -26, nt: null, t: 0 }];
    else r.ortho = [{ dx: 0, dy: pre ? 22 : -24, nt: null, t: 0 }];
    return r;
  }

  _nuevaVesicula(acoplar) {
    const r = this.rnd;
    let x, y;
    if (acoplar >= 0) { x = 344 + acoplar * 56; y = 183; } else {
      do { x = 220 + r() * 360; y = 72 + r() * 104; } while (!dentroPre(x, y) || this.vesiculas.some((v) => Math.hypot(v.x - x, v.y - y) < 27));
    }
    const v = { x, y, r: 12.5, estado: acoplar >= 0 ? 'acoplada' : 'libre', t: 0, lleno: 1, slot: acoplar, fx: x, fy: y, fase: r() * 6.28 };
    this.vesiculas.push(v);
    return v;
  }

  // ---- simulación ----
  paso(dt, e) {
    this.t += dt;
    const cfg = this.cfg;
    const f = e.farmaco; // presencia 0..1
    const ef = e.efecto; // ocupación efectiva 0..1
    const acc = cfg.farmaco?.accion;
    const obj = cfg.farmaco?.objetivo;
    const r = this.rnd;
    // modificadores del fármaco
    const occ = f * ef;
    let pRel = 0.55, nPorVes = 12, kCaptura = 2.2, caAbre = 1;
    if (obj === 'pre-receptor' && (acc === 'agonista' || acc === 'agonista-parcial')) { caAbre *= 1 - 0.7 * occ * (acc === 'agonista' ? 1 : 0.5); }
    if (obj === 'canalCa') caAbre *= 1 - 0.55 * occ;
    if (obj === 'sv2a') pRel *= 1 - 0.5 * occ;
    if (obj === 'enzima' || obj === 'enzima-glia') nPorVes = Math.round(12 * (1 + 0.8 * occ));
    if (obj === 'transportador') kCaptura *= 1 - 0.92 * occ;
    if (cfg.pre?.receptor && this.receptorPre) caAbre *= 1 - 0.55 * this.receptorPre.activacion * (obj === 'pre-receptor' ? 1 : 0.5);
    if (cfg.pre?.liberacionExtra) pRel *= cfg.pre.liberacionExtra;
    pRel *= caAbre;
    this.pRelEfectiva = pRel;

    // ligando que llega por difusión (hormona), sin terminal presináptica
    if (this.difusa) {
      if (r() < dt * 7) this.particulas.push({ x: 120 + r() * 560, y: HENDIDURA.y0 + 2, vx: (r() - 0.5) * 40, vy: 30 + r() * 30, vida: 0, estado: 'libre', color: this.nt.color, co: false });
    }
    // potencial de acción periódico
    this.proximoPA -= dt;
    if (this.difusa) this.proximoPA = 99;
    if (this.proximoPA <= 0) {
      this.proximoPA = (cfg.periodo || 2.6) * (0.85 + r() * 0.3);
      this.paFase = 0;
    }
    if (this.paFase >= 0) {
      const antes = this.paFase;
      this.paFase += dt / 0.5;
      if (antes < 1 && this.paFase >= 1) {
        // llega el PA al terminal: abren canales de Ca²⁺
        for (const c of this.canalesCa) c.abierto = caAbre;
        const nCa = Math.round(6 * caAbre);
        for (const c of this.canalesCa) for (let i = 0; i < nCa; i++) this._ion('Ca', c.x + (r() - 0.5) * 6, 192 - r() * 20, c.x, 222, 'entra-pre', i * 0.05);
        for (const v of this.vesiculas) if (v.estado === 'acoplada' && r() < pRel) { v.estado = 'fusion'; v.t = 0; v.n = nPorVes; }
      }
      if (this.paFase > 1.4) this.paFase = -1;
    }
    for (const c of this.canalesCa) c.abierto = Math.max(0, c.abierto - dt * 2.2);

    // vesículas
    for (const v of this.vesiculas) {
      v.t += dt;
      if (v.estado === 'libre') {
        v.x = v.fx + Math.sin(this.t * 0.8 + v.fase) * 3; v.y = v.fy + Math.cos(this.t * 0.6 + v.fase) * 3;
      } else if (v.estado === 'acoplando') {
        const k = Math.min(1, v.t / 0.9);
        v.x = v.ax + (344 + v.slot * 56 - v.ax) * k; v.y = v.ay + (183 - v.ay) * k;
        if (k >= 1) { v.estado = 'acoplada'; v.t = 0; }
      } else if (v.estado === 'fusion') {
        const k = Math.min(1, v.t / 0.28);
        v.y = 183 + 12 * k; v.r = 12.5 * (1 - 0.6 * k);
        if (k >= 1) {
          v.estado = 'vacia';
          for (let i = 0; i < v.n; i++) {
            const nt2 = !!this.nt2 && i % 4 === 0;
            this.particulas.push({ x: v.x + (r() - 0.5) * 10, y: 214, vx: (r() - 0.5) * 90, vy: 40 + r() * 70, vida: 0, estado: 'libre', color: nt2 ? this.nt2.color : this.nt.color, co: nt2 });
          }
          // la siguiente vesícula de la reserva se acopla en ese sitio
          const libres = this.vesiculas.filter((w) => w.estado === 'libre');
          if (libres.length) {
            const w = libres[Math.floor(r() * libres.length)];
            w.estado = 'acoplando'; w.t = -0.4 - r() * 0.6; w.ax = w.x; w.ay = w.y; w.slot = v.slot;
          }
        }
      }
    }
    this.vesiculas = this.vesiculas.filter((v) => v.estado !== 'vacia');
    // endocitosis: reponer reserva
    while (!this.difusa && this.vesiculas.length < 14) this._nuevaVesicula(-1);
    for (const v of this.vesiculas) if (v.estado === 'acoplando' && v.t < 0) { v.x = v.ax; v.y = v.ay; }

    // neurotransmisor
    const vida = cfg.vidaNT || 2.4;
    for (const p of this.particulas) {
      p.vida += dt;
      if (p.estado === 'unido') continue;
      p.vx += gauss(r) * 260 * dt; p.vy += gauss(r) * 260 * dt;
      p.vx *= 1 - 2.4 * dt; p.vy *= 1 - 2.4 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const yb = HENDIDURA.y1(p.x);
      if (p.y < HENDIDURA.y0) { p.y = HENDIDURA.y0; p.vy = Math.abs(p.vy); }
      if (p.y > yb) { p.y = yb; p.vy = -Math.abs(p.vy); }
      // recaptación
      const tr = this.transportador;
      if (tr && !p.co) {
        const d = Math.hypot(p.x - (tr.x + 12), p.y - (tr.y + 24));
        if (d < 40 && r() < kCaptura * dt * 3) { p.estado = 'captado'; tr.captura = 1; }
      }
      if (this.glia && p.x > 640 && r() < 1.6 * dt) p.estado = 'captado-glia';
      if (p.x < 70 || p.x > 730 || p.vida > vida * (tr ? 1 + 2.2 * (1 - kCaptura / 2.2) : 1)) p.estado = 'perdido';
    }
    if (this.transportador) this.transportador.captura = Math.max(0, this.transportador.captura - dt * 2);
    this.particulas = this.particulas.filter((p) => p.estado === 'libre' || p.estado === 'unido');

    // fármaco: partículas libres en la hendidura (o en el terminal / glía)
    const objetivoN = Math.round(f * (obj === 'sv2a' ? 6 : 9) * (0.5 + 0.5 * Math.min(2, ef * 1.6)));
    const libres = this.farmacos.filter((d) => d.estado !== 'saliendo');
    if (libres.length < objetivoN && r() < dt * 6) {
      const lado = r() < 0.5 ? 0 : 1;
      if (obj === 'sv2a' || obj === 'enzima') this.farmacos.push({ x: 380 + (r() - 0.5) * 60, y: 20, vx: 0, vy: 40, estado: 'libre', dentro: 'pre', rot: r() * 6 });
      else if (obj === 'enzima-glia') this.farmacos.push({ x: 770, y: 240, vx: -30, vy: 0, estado: 'libre', dentro: 'glia', rot: r() * 6 });
      else this.farmacos.push({ x: lado ? 735 : 65, y: 226 + r() * 18, vx: lado ? -60 : 60, vy: 0, estado: 'libre', rot: r() * 6 });
    } else if (libres.length > objetivoN && r() < dt * 4) {
      const d = libres.find((x) => x.estado === 'libre') || libres[0];
      if (d) { d.estado = 'saliendo'; this._liberarSitio(d); }
    }
    this._moverFarmacos(dt, occ, acc, obj);

    // receptores
    let flujoNeto = 0;
    for (const rec of [...this.receptores, this.receptorPre].filter(Boolean)) {
      flujoNeto += this._pasoReceptor(rec, dt, occ, acc, obj);
    }
    this.flujo += (flujoNeto - this.flujo) * Math.min(1, dt * 4);

    // iones
    for (const io of this.iones) {
      io.t += dt;
      if (io.t < 0) continue;
      const k = Math.min(1, io.t / io.dur);
      const s = k * k * (3 - 2 * k);
      io.x = io.x0 + (io.x1 - io.x0) * s + Math.sin(io.t * 9 + io.fase) * 1.2;
      io.y = io.y0 + (io.y1 - io.y0) * s;
      io.alfa = k < 0.85 ? 1 : (1 - k) / 0.15;
    }
    this.iones = this.iones.filter((io) => io.t < io.dur);

    // potencial postsináptico (mini traza)
    const objetivoVm = -70 + this.flujo;
    this.vmActual += (objetivoVm - this.vmActual) * Math.min(1, dt * 6);
    this.vm.push(this.vmActual);
    if (this.vm.length > 260) this.vm.shift();
  }

  _ion(tipo, x0, y0, x1, y1, modo, retardo = 0) {
    this.iones.push({ tipo, x0, y0, x1, y1, x: x0, y: y0, t: -retardo, dur: 0.55 + this.rnd() * 0.25, fase: this.rnd() * 6, modo, alfa: 1 });
  }

  _sitioFarmaco(rec, obj, acc) {
    // posición del sitio de unión del fármaco en el receptor
    const s = this.cfg.farmaco?.sitio;
    if (rec.tipo === 'canal') {
      if (s === 'bzd' || s === 'alosterico') return { dx: 22, dy: -6 + -14, clave: 'alo' };
      if (s === 'tm' || s === 'barb' || s === 'anest') return { dx: 26, dy: 8, clave: 'tm' };
      if (s === 'poro') return { dx: 0, dy: 6, clave: 'poro' };
      return { dx: -15, dy: -26, clave: 'orto' };
    }
    return { dx: 0, dy: rec.pre ? 22 : -24, clave: 'orto' };
  }

  _objetivosFarmaco(obj) {
    if (obj === 'post' || obj === 'post0' || obj === 'post1') {
      return this.receptores.filter((rec, i) => obj === 'post' || (obj === 'post0' ? rec.def === (this.cfg.post[0]) : rec.def === this.cfg.post[1]));
    }
    if (obj === 'pre-receptor' || obj === 'autorreceptor') return this.receptorPre ? [this.receptorPre] : [];
    return [];
  }

  _moverFarmacos(dt, occ, acc, obj) {
    const r = this.rnd;
    const objetivos = this._objetivosFarmaco(obj);
    for (const d of this.farmacos) {
      d.rot += dt * 0.6;
      if (d.estado === 'unido') {
        d.t += dt;
        const s = d.sitio;
        d.x += (s.x - d.x) * Math.min(1, dt * 10); d.y += (s.y - d.y) * Math.min(1, dt * 10);
        // tiempo de residencia: se suelta y vuelve a unirse según la ocupación
        if (d.t > d.residencia && r() < dt * 0.6) { d.estado = 'libre'; this._liberarSitio(d); d.vx = (r() - 0.5) * 80; d.vy = -40; }
        continue;
      }
      if (d.estado === 'saliendo') {
        d.vx += (d.x < 400 ? -1 : 1) * 160 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt; d.alfa = Math.max(0, (d.alfa ?? 1) - dt * 0.9);
        continue;
      }
      // libre: movimiento browniano con leve atracción hacia un sitio vacío
      d.vx += gauss(r) * 160 * dt; d.vy += gauss(r) * 160 * dt;
      d.vx *= 1 - 2 * dt; d.vy *= 1 - 2 * dt;
      let destino = null;
      if (d.dentro === 'pre') {
        // SV2A en vesículas / enzima en el terminal
        const v = this.vesiculas.find((w) => !w.farmaco && (w.estado === 'libre' || w.estado === 'acoplada'));
        if (v && obj === 'sv2a') destino = { x: v.x + 9, y: v.y - 9, vesicula: v };
        else if (obj === 'enzima') destino = { x: 470, y: 110, enzima: true };
      } else if (d.dentro === 'glia') {
        destino = { x: 724, y: 236, glia: true };
      } else if (obj === 'transportador' && this.transportador && !this.transportador.farmaco) {
        destino = { x: this.transportador.x + 14, y: this.transportador.y + 30, transp: true };
      } else if (obj === 'canalCa') {
        const c = this.canalesCa.find((cc) => !cc.farmaco);
        if (c) destino = { x: c.x - 14, y: 220, canal: c };
      } else {
        for (const rec of objetivos) {
          const s = this._sitioFarmaco(rec, obj, acc);
          if (rec.farmacoSitio[s.clave]) continue;
          if (s.clave === 'poro' && !rec.estadoAbierto) continue;
          const sx = rec.x + s.dx, sy = rec.y + s.dy;
          if (!destino || Math.hypot(sx - d.x, sy - d.y) < Math.hypot(destino.x - d.x, destino.y - d.y)) destino = { x: sx, y: sy, rec, clave: s.clave };
        }
      }
      const ocupados = this.farmacos.filter((x) => x.estado === 'unido').length;
      const total = Math.max(1, (objetivos.length || 1) * (obj === 'sv2a' ? 3 : 1));
      const quiere = ocupados / total < occ * 1.05 + 0.02;
      if (destino && quiere) {
        const dx = destino.x - d.x, dy = destino.y - d.y, L = Math.hypot(dx, dy) || 1;
        d.vx += (dx / L) * 420 * dt; d.vy += (dy / L) * 420 * dt;
        if (L < 7) {
          d.estado = 'unido'; d.t = 0; d.residencia = 1.5 + r() * 3;
          d.sitio = { x: destino.x, y: destino.y };
          if (destino.rec) { destino.rec.farmacoSitio[destino.clave] = d; d.rec = destino.rec; d.clave = destino.clave; }
          if (destino.vesicula) { destino.vesicula.farmaco = d; d.vesicula = destino.vesicula; }
          if (destino.transp) { this.transportador.farmaco = d; d.transp = true; }
          if (destino.canal) { destino.canal.farmaco = d; d.canal = destino.canal; }
          if (destino.enzima) d.enzima = true;
          if (destino.glia) d.glia = true;
        }
      }
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (!d.dentro) {
        const yb = HENDIDURA.y1(d.x) + (destino?.clave === 'tm' && quiere ? 22 : 0);
        if (d.y < HENDIDURA.y0 + 2) { d.y = HENDIDURA.y0 + 2; d.vy = Math.abs(d.vy); }
        if (d.y > yb) { d.y = yb; d.vy = -Math.abs(d.vy); }
        d.x = Math.max(60, Math.min(740, d.x));
      } else if (d.dentro === 'pre') {
        d.x = Math.max(240, Math.min(560, d.x)); d.y = Math.max(20, Math.min(180, d.y));
      } else { d.x = Math.max(670, Math.min(780, d.x)); d.y = Math.max(170, Math.min(320, d.y)); }
    }
    // las vesículas acopladas a SV2A siguen al fármaco
    for (const d of this.farmacos) if (d.vesicula && d.estado === 'unido') { d.sitio.x = d.vesicula.x + 9; d.sitio.y = d.vesicula.y - 9; }
    this.farmacos = this.farmacos.filter((d) => d.estado !== 'saliendo' || (d.alfa ?? 1) > 0.02);
  }

  _liberarSitio(d) {
    if (d.rec) { if (d.rec.farmacoSitio[d.clave] === d) delete d.rec.farmacoSitio[d.clave]; d.rec = null; }
    if (d.vesicula) { d.vesicula.farmaco = null; d.vesicula = null; }
    if (d.transp && this.transportador) { this.transportador.farmaco = null; d.transp = false; }
    if (d.canal) { d.canal.farmaco = null; d.canal = null; }
  }

  _pasoReceptor(rec, dt, occ, acc, obj) {
    const r = this.rnd;
    const def = rec.def;
    // unión del neurotransmisor a los sitios ortostéricos
    const antag = rec.farmacoSitio.orto && (acc === 'antagonista' || acc === 'agonista-parcial' || acc === 'agonista');
    // las BZD aumentan la afinidad del receptor por el GABA (más uniones → más aperturas)
    const pamAfinidad = acc === 'pam-frec' && Object.values(rec.farmacoSitio).length > 0;
    const radio = pamAfinidad ? 17 : 11;
    for (const s of rec.ortho) {
      if (s.nt) {
        s.t -= dt;
        s.nt.x = rec.x + s.dx; s.nt.y = rec.y + s.dy;
        if (s.t <= 0) { s.nt.estado = 'libre'; s.nt.vy = rec.pre ? 30 : -50; s.nt.vx = (r() - 0.5) * 60; s.nt = null; }
        continue;
      }
      if (antag) continue;
      if (rec.def.ligando && rec.def.ligando !== this.cfg.nt) continue;
      for (const p of this.particulas) {
        if (p.estado !== 'libre' || p.co !== !!rec.def.co) continue;
        if (Math.hypot(p.x - (rec.x + s.dx), p.y - (rec.y + s.dy)) < radio) {
          p.estado = 'unido'; s.nt = p; s.t = (0.25 + r() * 0.35) * (pamAfinidad ? 1.7 : 1); break;
        }
      }
    }
    const ntUnido = rec.ortho.filter((s) => s.nt).length;
    rec.unionNT = ntUnido;
    const farmacoAqui = Object.values(rec.farmacoSitio).length > 0;
    const sitioF = Object.keys(rec.farmacoSitio)[0];
    let aporte = 0;
    if (rec.tipo === 'canal') {
      // compuerta: abierto ↔ cerrado mientras hay agonista unido
      let kAbre = ntUnido ? (def.kAbre || 7) * (ntUnido === 2 ? 1 : 0.45) : 0;
      let tauAbierto = def.tauAbierto || 0.11;
      if (farmacoAqui) {
        if (acc === 'pam-frec') kAbre *= 3.2;
        if (acc === 'pam-dur') tauAbierto *= 3.6;
        if (acc === 'pam-dur' || acc === 'pam-anest') { tauAbierto *= acc === 'pam-anest' ? 2.6 : 1; kAbre *= acc === 'pam-anest' ? 1.6 : 1; }
        if ((acc === 'pam-dur' || acc === 'pam-anest') && this.cfg.farmaco.directo) kAbre += this.cfg.farmaco.directo * Math.max(0, occ - 0.45) * 8;
        if (acc === 'nam') kAbre *= 0.08;
        if (acc === 'agonista' && sitioF === 'orto') kAbre = Math.max(kAbre, 7);
      }
      rec.tEstado -= dt;
      if (rec.estadoAbierto) {
        if (rec.tEstado <= 0) { rec.estadoAbierto = false; rec.tEstado = 0; }
      } else if (kAbre > 0 && r() < kAbre * dt) {
        rec.estadoAbierto = true;
        rec.tEstado = -Math.log(1 - r()) * tauAbierto + 0.03;
        rec.aperturas = (rec.aperturas || 0) + 1;
      }
      rec.abierto += ((rec.estadoAbierto ? 1 : 0) - rec.abierto) * Math.min(1, dt * 22);
      const bloqueado = rec.farmacoSitio.poro && acc === 'bloqueo-poro';
      if (rec.estadoAbierto && !bloqueado) {
        // Mg²⁺ en NMDA: bloqueo dependiente de voltaje (se libera con despolarización)
        const ion = def.ion || 'Na';
        const tasa = def.mg ? 10 : 34;
        if (r() < tasa * dt) {
          const entra = (def.dir || 'entra') === 'entra';
          const yA = rec.y - 34, yB = rec.y + 40;
          this._ion(ion, rec.x + (r() - 0.5) * 4, entra ? yA : yB, rec.x + (r() - 0.5) * 30, entra ? yB + 10 : yA - 8, 'canal');
          if (def.ion2 && r() < 0.35) this._ion(def.ion2, rec.x, yA, rec.x + (r() - 0.5) * 30, yB + 10, 'canal');
        }
        aporte = (def.signo ?? (ion === 'Cl' ? -1 : 1)) * 4.2;
      }
    } else {
      // GPCR
      let objetivo = ntUnido ? 1 : 0;
      if (rec.farmacoSitio.orto) {
        if (acc === 'agonista') objetivo = 1;
        else if (acc === 'agonista-parcial') objetivo = this.cfg.farmaco.intrinseca ?? 0.3;
        else objetivo = 0;
      }
      rec.activacion += (objetivo - rec.activacion) * Math.min(1, dt * (objetivo > rec.activacion ? 5 : 1.4));
      const a = rec.activacion;
      rec.gAlfa += (a - rec.gAlfa) * Math.min(1, dt * 3);
      const ef = def.efector;
      const g = def.g || 'Gi/o';
      if (g === 'Gi/o') {
        if (!rec.pre) {
          if (ef === 'GIRK' || ef === 'GIRK+AC') {
            if (rec.gAlfa > 0.25 && r() < 14 * rec.gAlfa * dt) this._ion('K', rec.x - 62, rec.y + 30, rec.x - 62 + (r() - 0.5) * 16, rec.y - 40, 'girk');
            aporte = -5 * rec.gAlfa;
          } else aporte = -2.2 * rec.gAlfa;
        }
        this.ampc += ((18 - 14 * rec.gAlfa) - this.ampc) * Math.min(1, dt * 0.8);
      } else if (g === 'Gq') {
        aporte = 4 * rec.gAlfa;
      } else if (g === 'Gs') {
        aporte = 2.5 * rec.gAlfa;
        this.ampc += ((18 + 20 * rec.gAlfa) - this.ampc) * Math.min(1, dt * 0.8);
      }
    }
    return aporte;
  }

  // ---- dibujo ----
  dibujar(ctx, e) {
    const cfg = this.cfg;
    const nt = this.nt;
    // citoplasmas
    ctx.save();
    if (!this.difusa) {
      ctx.beginPath();
      PRE.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      const gPre = ctx.createLinearGradient(0, 0, 0, 210);
      gPre.addColorStop(0, 'rgba(70,90,140,0.10)');
      gPre.addColorStop(1, 'rgba(90,110,170,0.20)');
      ctx.fillStyle = gPre;
      ctx.fill();
    } else {
      const g = ctx.createLinearGradient(0, 60, 0, 220);
      g.addColorStop(0, 'rgba(140,158,255,0.0)');
      g.addColorStop(1, 'rgba(140,158,255,0.10)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 60, W, 160);
      rotulo(ctx, 'Melatonina que llega por la sangre y el LCR (glándula pineal, de noche)', 400, 150, { tam: 12, color: '#b8c4ff' });
    }
    ctx.beginPath();
    POST.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineTo(770, H + 5); ctx.lineTo(30, H + 5); ctx.closePath();
    const gPost = ctx.createLinearGradient(0, 260, 0, H);
    gPost.addColorStop(0, 'rgba(90,110,170,0.20)');
    gPost.addColorStop(1, 'rgba(60,80,130,0.06)');
    ctx.fillStyle = gPost;
    ctx.fill();
    ctx.restore();

    // astrocito
    if (this.glia) this._dibujarGlia(ctx, e);

    // potencial de acción bajando por el axón
    if (this.paFase >= 0 && this.paFase < 1.2) {
      const y = -10 + Math.min(1, this.paFase) * 200;
      const a = this.paFase < 1 ? 1 : 1 - (this.paFase - 1) / 0.2;
      brillo(ctx, 400, Math.min(y, 150), 70, '#ffd28a', 0.9 * a);
    }

    // membranas con huecos para proteínas
    const huecosPre = this.canalesCa.map((c) => [c.x - 13, c.x + 13]);
    if (this.transportador) huecosPre.push([this.transportador.x - 6, this.transportador.x + 30]);
    if (this.receptorPre) huecosPre.push([this.receptorPre.x - 26, this.receptorPre.x + 26]);
    if (!this.difusa) bicapa(ctx, PRE, { grosor: MEMB, huecos: huecosPre.map(([a, b]) => [a, b]) });
    const huecosPost = this.receptores.map((rec) => [rec.x - 28, rec.x + 28]);
    for (const rec of this.receptores) if (rec.tipo === 'gpcr' && /GIRK/.test(rec.def.efector || '')) huecosPost.push([rec.x - 76, rec.x - 48]);
    bicapa(ctx, POST, { grosor: MEMB, huecos: huecosPost });

    // vesículas
    for (const v of this.vesiculas) this._dibujarVesicula(ctx, v);

    // canales de Ca²⁺
    for (const c of this.canalesCa) this._dibujarCanalCa(ctx, c);
    if (this.transportador) this._dibujarTransportador(ctx, this.transportador);
    if (this.receptorPre) this._dibujarGPCR(ctx, this.receptorPre, true);

    // receptores postsinápticos
    for (const rec of this.receptores) {
      if (rec.tipo === 'canal') this._dibujarCanal(ctx, rec);
      else this._dibujarGPCR(ctx, rec, false);
    }

    // neurotransmisor
    for (const p of this.particulas) {
      const a = Math.min(1, (this.cfg.vidaNT || 2.4) * 1.5 - p.vida);
      brillo(ctx, p.x, p.y, 8, p.color, 0.6 * Math.max(0.2, a));
      circulo(ctx, p.x, p.y, p.co ? 4.2 : 3.4, p.color);
      if (p.co) { ctx.strokeStyle = '#fff6'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    // iones
    for (const io of this.iones) {
      if (io.t < 0) continue;
      const def = IONES[io.tipo];
      ctx.globalAlpha = io.alfa;
      brillo(ctx, io.x, io.y, 7, def.color, 0.7);
      circulo(ctx, io.x, io.y, 2.8, def.color);
      ctx.globalAlpha = 1;
    }
    // fármaco
    for (const d of this.farmacos) this._dibujarFarmaco(ctx, d, e);

    // AMPc (señal intracelular de GPCR)
    if ((cfg.post || []).some((p) => p.tipo === 'gpcr' && (p.efector || '').includes('AC'))) this._dibujarAMPc(ctx);

    if (e.rotulos) this._rotulos(ctx, e);
    if (cfg.pasos) this._pasos(ctx);
    this._traza(ctx, e);
  }

  _pasos(ctx) {
    // [x, y, texto, lado del rótulo: i = izquierda, d = derecha, a = arriba]
    const P = [
      [560, 86, 'Síntesis', 'd'], [214, 132, 'Almacenamiento', 'i'], [532, 226, 'Entrada de Ca²⁺', 'd'], [400, 190, 'Exocitosis', 'a'],
      [250, 230, 'Unión al receptor', 'i'], [400, 350, 'Respuesta postsináptica', 'd'], [176, 196, 'Terminación', 'i'],
    ];
    P.forEach(([x, y, t, lado], i) => {
      const pulso = 0.5 + 0.5 * Math.sin(this.t * 3 + i);
      ctx.save();
      circulo(ctx, x, y, 11 + pulso, 'rgba(255,231,163,0.95)', '#1a1f2c', 1.5);
      rotulo(ctx, String(i + 1), x, y + 0.5, { tam: 12, color: '#1a1f2c', peso: 700, fuente: FUENTE.titulo });
      if (lado === 'a') pildora(ctx, t, x, y - 26, { tam: 10.5 });
      else pildora(ctx, t, x + (lado === 'i' ? -16 : 16), y, { tam: 10.5, alinear: lado === 'i' ? 'right' : 'left' });
      ctx.restore();
    });
  }

  _dibujarVesicula(ctx, v) {
    const c = this.nt.color;
    ctx.save();
    ctx.globalAlpha = v.estado === 'acoplando' && v.t < 0 ? 1 : 1;
    circulo(ctx, v.x, v.y, v.r, 'rgba(20,28,44,0.85)', rgba(TINTA.membrana, 0.85), 2.2);
    const n = v.estado === 'fusion' ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39 + v.fase, rr = v.r * 0.5 * Math.sqrt((i + 0.5) / n);
      circulo(ctx, v.x + Math.cos(a) * rr, v.y + Math.sin(a) * rr, 2.1, c);
    }
    if (this.nt2) circulo(ctx, v.x + 4, v.y - 3, 2.6, this.nt2.color);
    ctx.restore();
  }

  _dibujarCanalCa(ctx, c) {
    const col = IONES.Ca.color;
    const ab = c.abierto;
    const sep = 2 + ab * 4;
    ctx.save();
    for (const s of [-1, 1]) {
      rrect(ctx, c.x + s * sep - (s < 0 ? 9 : 0), c.y - 13, 9, 26, 4);
      ctx.fillStyle = mezcla('#5a4260', col, 0.25 + 0.4 * ab);
      ctx.fill();
      ctx.strokeStyle = rgba(col, 0.7);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (c.a2d) {
      // subunidad α2δ (extracelular)
      circulo(ctx, c.x + 13, c.y + 14, 6.5, c.farmaco ? '#3b4b66' : '#4b3a63', '#b9a3e8', 1.2);
      rotulo(ctx, 'α2δ', c.x + 13, c.y + 26, { tam: 8.5, color: '#c9b8e8' });
    }
    ctx.restore();
  }

  _dibujarTransportador(ctx, tr) {
    const color = this.nt.color;
    ctx.save();
    ctx.translate(tr.x, tr.y);
    ctx.rotate(-0.42);
    rrect(ctx, -2, -14, 30, 30, 9);
    ctx.fillStyle = tr.farmaco ? '#3a3f52' : mezcla('#2c3a55', color, 0.25 + 0.3 * tr.captura);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.8);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(13, -12); ctx.lineTo(13, 14);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  _dibujarCanal(ctx, rec) {
    const def = rec.def;
    const ab = rec.abierto;
    const x = rec.x, y = rec.y;
    const colA = def.color || '#6f86b8';
    const sep = 1.5 + ab * 5.5;
    ctx.save();
    // subunidad trasera (profundidad)
    rrect(ctx, x - 10, y - 38, 20, 66, 9);
    ctx.fillStyle = 'rgba(70,82,110,0.55)';
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(x + s * sep, y);
      // dominio extracelular + transmembrana
      ctx.beginPath();
      const w = 19;
      if (s < 0) {
        ctx.moveTo(0, -40); ctx.bezierCurveTo(-w - 8, -44, -w - 8, -14, -w + 2, -10);
        ctx.lineTo(-w + 3, 26); ctx.quadraticCurveTo(-w + 2, 34, -8, 34); ctx.lineTo(0, 30); ctx.lineTo(0, 8); ctx.lineTo(-2, -8); ctx.closePath();
      } else {
        ctx.moveTo(0, -40); ctx.bezierCurveTo(w + 8, -44, w + 8, -14, w - 2, -10);
        ctx.lineTo(w - 3, 26); ctx.quadraticCurveTo(w - 2, 34, 8, 34); ctx.lineTo(0, 30); ctx.lineTo(0, 8); ctx.lineTo(2, -8); ctx.closePath();
      }
      const g = ctx.createLinearGradient(0, -44, 0, 34);
      const sub = s < 0 ? (def.subA || colA) : (def.subB || mezcla(colA, '#ffffff', 0.15));
      g.addColorStop(0, mezcla(sub, '#ffffff', 0.12));
      g.addColorStop(1, mezcla(sub, '#000000', 0.35));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.18);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
    // bolsillos de unión
    for (const s of rec.ortho) {
      ctx.beginPath();
      ctx.arc(x + s.dx + (s.dx < 0 ? -sep : sep), y + s.dy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fill();
      ctx.strokeStyle = rgba(this.nt.color, s.nt ? 0.9 : 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // sitio alostérico del fármaco (si aplica)
    const sitio = this.cfg.farmaco?.sitio;
    if (sitio && rec.def === this.cfg.post?.[this._indiceObjetivo()]) {
      const sf = this._sitioFarmaco(rec);
      if (sf.clave !== 'orto') {
        ctx.beginPath();
        ctx.arc(x + sf.dx + (sf.dx > 0 ? sep : 0), y + sf.dy, 6.5, 0, Math.PI * 2);
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = rgba(COLOR_FARMACO_HALO, 0.55);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // tapón de Mg²⁺ en NMDA en reposo
    if (def.mg && !rec.farmacoSitio.poro) {
      const ymg = y + 2 - ab * 14;
      if (!rec.estadoAbierto || ab < 0.6) circulo(ctx, x, ymg, 3.6, IONES.Mg.color);
    }
    // brillo del poro cuando conduce
    if (ab > 0.05 && !(rec.farmacoSitio.poro && this.cfg.farmaco?.accion === 'bloqueo-poro')) {
      brillo(ctx, x, y + 4, 20, IONES[def.ion || 'Na'].color, ab * 0.6);
    }
    ctx.restore();
  }

  _indiceObjetivo() {
    const o = this.cfg.farmaco?.objetivo;
    return o === 'post1' ? 1 : 0;
  }

  _dibujarGPCR(ctx, rec, pre) {
    const def = rec.def;
    const a = rec.activacion;
    const x = rec.x, y = rec.y;
    const col = def.color || '#8f7ad6';
    const dir = pre ? -1 : 1; // en presináptico la cara extracelular mira hacia abajo
    ctx.save();
    // 7 hélices transmembrana
    for (let i = 0; i < 7; i++) {
      const hx = x - 21 + i * 7;
      const off = (i % 2 ? 1 : -1) * 1.5 + (i >= 3 && i <= 4 ? a * (i === 3 ? -2 : 4) : 0);
      rrect(ctx, hx - 3.4 + off, y - 17, 6.8, 34, 3.4);
      const g = ctx.createLinearGradient(hx - 3, 0, hx + 3, 0);
      g.addColorStop(0, mezcla(col, '#000000', 0.25));
      g.addColorStop(0.5, mezcla(col, '#ffffff', 0.15 + 0.25 * a));
      g.addColorStop(1, mezcla(col, '#000000', 0.25));
      ctx.fillStyle = g;
      ctx.fill();
    }
    // asas
    ctx.strokeStyle = rgba(col, 0.75);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const hx = x - 21 + i * 7;
      const yy = (i % 2 === 0 ? -17 : 17) * dir;
      ctx.moveTo(hx, y + yy);
      ctx.quadraticCurveTo(hx + 3.5, y + yy - 6 * dir * (i % 2 === 0 ? 1 : -1), hx + 7, y + yy);
    }
    ctx.stroke();
    // bolsillo ortostérico
    const s = rec.ortho[0];
    ctx.beginPath();
    ctx.arc(x + s.dx, y + s.dy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    ctx.strokeStyle = rgba(NT[def.ligando || this.cfg.nt]?.color || '#fff', s.nt ? 0.9 : 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    // proteína G heterotrimérica (intracelular)
    const yg = y + 30 * dir;
    const sepa = rec.gAlfa;
    const xa = x + 10 + sepa * 36, xb = x - 12 - sepa * 22;
    const gColor = '#7fc8a9';
    circulo(ctx, xa, yg + sepa * 6 * dir, 8.5, mezcla('#3b5b52', gColor, 0.4 + 0.5 * sepa), rgba(gColor, 0.9), 1);
    rotulo(ctx, 'α', xa, yg + sepa * 6 * dir + 0.5, { tam: 10, color: '#0b1018', peso: 700 });
    circulo(ctx, xb, yg, 6.5, '#556a8a', '#9fb4d6', 1);
    circulo(ctx, xb - 9, yg + 3 * dir, 4.5, '#556a8a', '#9fb4d6', 1);
    rotulo(ctx, 'βγ', xb - 4, yg + 1, { tam: 8, color: '#dfe7f5', peso: 700 });
    // GTP/GDP
    rotulo(ctx, sepa > 0.4 ? 'GTP' : 'GDP', xa, yg + (sepa * 6 + 14) * dir, { tam: 8, color: sepa > 0.4 ? '#bff5d6' : '#8aa' });
    // efectores
    const ef = def.efector || '';
    if (!pre && ef.includes('GIRK')) {
      const gx = x - 62;
      const abG = Math.min(1, rec.gAlfa * 1.3);
      for (const s2 of [-1, 1]) {
        rrect(ctx, gx + s2 * (1.5 + abG * 3.5) - (s2 < 0 ? 8 : 0), y - 15, 8, 30, 4);
        ctx.fillStyle = mezcla('#4a3d66', IONES.K.color, 0.2 + 0.5 * abG);
        ctx.fill();
      }
      if (abG > 0.1) brillo(ctx, gx, y, 16, IONES.K.color, abG * 0.5);
      if (pre === false) rotulo(ctx, 'GIRK', gx, y + 26, { tam: 8.5, color: '#c8b6f0' });
    }
    if (pre) {
      // βγ cierra los canales de Ca²⁺ cercanos
      if (a > 0.3) {
        ctx.setLineDash([3, 3]);
        flecha(ctx, x - 30, y + 2, 520, 200, rgba('#9fb4d6', 0.6 * a), 1.2, 5);
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  _dibujarAMPc(ctx) {
    const n = Math.round(this.ampc);
    const r = aleatorio(7);
    for (let i = 0; i < n; i++) {
      const x = 470 + r() * 200, y = 360 + r() * 90 + Math.sin(this.t * 1.3 + i) * 3;
      circulo(ctx, x, y, 2.2, '#f2c17a');
    }
    rotulo(ctx, 'AMPc', 640, 350, { tam: 10, color: '#f2c17a', alinear: 'right' });
  }

  _dibujarGlia(ctx, e) {
    ctx.save();
    const pts = [[800, 150], [720, 160], [672, 196], [662, 240], [676, 290], [730, 320], [800, 330]];
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = 'rgba(120,200,170,0.08)';
    ctx.fill();
    bicapa(ctx, pts.slice(0, -1).concat([[800, 330]]), { grosor: 12, color: '#9ed9c2', paso: 6, alfa: 0.75 });
    rotulo(ctx, 'Astrocito', 760, 182, { tam: 10, color: '#9ed9c2' });
    if (this.glia.enzima) {
      const inhib = this.farmacos.some((d) => d.glia && d.estado === 'unido');
      rrect(ctx, 704, 222, 44, 28, 8);
      ctx.fillStyle = inhib ? '#3a3f52' : '#2f5a4e';
      ctx.fill();
      ctx.strokeStyle = '#9ed9c2';
      ctx.stroke();
      rotulo(ctx, this.glia.enzima, 726, 236, { tam: 9, color: '#e6fff5', peso: 700 });
    }
    ctx.restore();
  }

  _dibujarFarmaco(ctx, d, e) {
    const a = d.alfa ?? 1;
    ctx.save();
    ctx.globalAlpha = a;
    brillo(ctx, d.x, d.y, 15, COLOR_FARMACO_HALO, d.estado === 'unido' ? 1 : 0.6);
    hexagono(ctx, d.x, d.y, 6.4, d.rot);
    ctx.fillStyle = COLOR_FARMACO;
    ctx.fill();
    ctx.strokeStyle = '#1a2233';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  _rotulos(ctx, e) {
    const cfg = this.cfg;
    const c = { color: TINTA.suave, tam: 10.5 };
    if (!this.difusa) rotulo(ctx, 'Neurona presináptica', 400, 46, { ...c, color: '#b9c6dc', tam: 11 });
    rotulo(ctx, 'Neurona postsináptica', 400, 476, { ...c, color: '#b9c6dc', tam: 11 });
    rotulo(ctx, 'Hendidura sináptica', 770, 214, { ...c, alinear: 'right' });
    if (!this.difusa) {
      rotulo(ctx, 'Vesícula', 248, 92, { ...c });
      rotulo(ctx, 'Ca²⁺', 300, 228, { ...c, color: IONES.Ca.color, tam: 9.5 });
    }
    if (this.transportador) rotulo(ctx, this.transportador.nombre, 172, 168, { ...c, color: this.nt.color, alinear: 'right' });
    if (this.receptorPre) rotulo(ctx, this.receptorPre.def.nombre, 636, 150, { ...c, color: '#c8b6f0', alinear: 'left' });
    if (cfg.pre?.a2d) rotulo(ctx, 'Canal de Ca²⁺ (CaV2)', 500, 238, { ...c, tam: 9 });
    const vistos = new Set();
    for (const rec of this.receptores) {
      if (vistos.has(rec.def.nombre)) continue;
      vistos.add(rec.def.nombre);
      pildora(ctx, rec.def.nombre, rec.x, rec.y + 56, { tam: 10, color: '#dfe7f5' });
      if (rec.tipo === 'canal' && rec.def.ion) rotulo(ctx, IONES[rec.def.ion].etiqueta + (rec.def.ion2 ? ' · ' + IONES[rec.def.ion2].etiqueta : ''), rec.x + 30, rec.y + 74, { tam: 9.5, color: IONES[rec.def.ion].color, alinear: 'left' });
      if (rec.tipo === 'gpcr') rotulo(ctx, rec.def.g || 'Gi/o', rec.x + 30, rec.y + 74, { tam: 9.5, color: '#7fc8a9', alinear: 'left' });
    }
    if (this.cfg.post?.some((p) => (p.efector || '').includes('GIRK'))) rotulo(ctx, 'K⁺', this.receptores[0].x - 62, this.receptores[0].y - 44, { tam: 9.5, color: IONES.K.color });
    // nombre del fármaco junto a una molécula unida
    const unido = this.farmacos.find((d) => d.estado === 'unido') || this.farmacos[0];
    if (unido && e.nombreFarmaco) pildora(ctx, e.nombreFarmaco, unido.x, unido.y - 18, { tam: 10, color: '#1a1f2c', fondo: COLOR_FARMACO_HALO, borde: COLOR_FARMACO_HALO });
  }

  _traza(ctx, e) {
    // mini osciloscopio: potencial postsináptico
    const x0 = 586, y0 = 400, w = 196, h = 82;
    ctx.save();
    rrect(ctx, x0, y0, w, h, 8);
    ctx.fillStyle = 'rgba(7,11,19,0.82)';
    ctx.fill();
    ctx.strokeStyle = TINTA.linea;
    ctx.stroke();
    rotulo(ctx, 'Potencial postsináptico', x0 + 8, y0 + 11, { tam: 9, color: TINTA.suave, alinear: 'left' });
    const yRef = y0 + 46;
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(147,161,184,0.35)';
    ctx.beginPath(); ctx.moveTo(x0 + 6, yRef); ctx.lineTo(x0 + w - 6, yRef); ctx.stroke();
    ctx.setLineDash([]);
    rotulo(ctx, '−70 mV', x0 + w - 8, yRef - 7, { tam: 8, color: TINTA.tenue, alinear: 'right', fuente: FUENTE.mono });
    ctx.beginPath();
    const n = this.vm.length;
    for (let i = 0; i < n; i++) {
      const x = x0 + 6 + (i / 259) * (w - 12);
      const y = yRef - (this.vm[i] + 70) * 2.6;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = this.flujo < -0.5 ? '#7cc4ff' : this.flujo > 0.5 ? '#ffb27a' : '#dfe7f5';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }
}

const ESCENAS = { quimica: EscenaQuimica, axon: EscenaAxon, cox: EscenaCox, placa: EscenaPlaca, hepatica: EscenaHepatica };

export class Sinapsis {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.estado = { farmaco: 0, efecto: 0.6, rotulos: true, nombreFarmaco: '' };
    this.objetivoFarmaco = 0;
    this.ultimo = performance.now();
    this.escena = null;
    this.visible = true;
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(canvas);
    this._bucle = this._bucle.bind(this);
    requestAnimationFrame(this._bucle);
  }

  mostrar(cfg, { nombre = '', aplicado = false, efecto = 0.6, semilla = 3 } = {}) {
    const firma = JSON.stringify(cfg);
    if (firma !== this.firma) {
      this.firma = firma;
      const Clase = ESCENAS[cfg?.tipo] || EscenaQuimica;
      this.escena = cfg ? new Clase(cfg, aleatorio(semilla)) : null;
      this.estado.farmaco = 0;
      // precalienta la simulación para que no arranque vacía
      if (this.escena) for (let i = 0; i < 90; i++) this.escena.paso(1 / 30, this.estado);
    }
    this.estado.nombreFarmaco = nombre;
    this.objetivoFarmaco = aplicado ? 1 : 0;
    this.estado.efecto = efecto;
  }

  aplicar(on) { this.objetivoFarmaco = on ? 1 : 0; }
  efecto(v) { this.estado.efecto = v; }
  opcion(clave, valor) { this.estado[clave] = valor; }

  destruir() { this.muerto = true; }

  _bucle(ahora) {
    if (this.muerto) return;
    requestAnimationFrame(this._bucle);
    const dt = Math.min(0.08, (ahora - this.ultimo) / 1000);
    this.ultimo = ahora;
    if (!this.visible || document.hidden || this.pausado || !this.escena) return;
    const e = this.estado;
    e.farmaco += (this.objetivoFarmaco - e.farmaco) * Math.min(1, dt * 2.6);
    this.escena.paso(dt * (e.velocidad || 1), e);
    const c = this.canvas;
    const r = c.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return;
    const dpr = ajustarLienzo(c, r.width, r.height);
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = TINTA.fondo;
    ctx.fillRect(0, 0, c.width, c.height);
    const s = Math.min(c.width / W, c.height / H);
    ctx.setTransform(s, 0, 0, s, (c.width - W * s) / 2, (c.height - H * s) / 2);
    // texto más grande cuanto más pequeño se dibuja el lienzo (legibilidad)
    escalaTexto(Math.max(1, Math.min(1.55, 0.95 / (s / dpr))));
    this.escena.dibujar(ctx, e);
    escalaTexto(1);
    this.escala = s / dpr;
  }
}
