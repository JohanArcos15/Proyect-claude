// Modelos de membrana tipo Hodgkin-Huxley, sin dependencias del DOM.
// Neurona cortical «regular spiking» de Pospischil et al. (2008, Biol Cybern
// 99:427): INa, IKd, IM y fuga, con cinética de Traub-Miles. Se le añaden las
// corrientes sobre las que actúan los fármacos:
//   GABA-A (Cl⁻), AMPA y NMDA (con bloqueo por Mg²⁺), GIRK (K⁺), K2P, canal T
//   de Ca²⁺ (Destexhe 1996) y bloqueo de Na⁺ dependiente del uso.
// Unidades: mV, ms, mS/cm², µA/cm², µF/cm².

const VT = -56.2;
const E = { Na: 50, K: -90, Cl: -75, L: -70.3, exc: 0, Ca: 120 };

const efrac = (x, y) => (Math.abs(x / y) < 1e-6 ? y * (1 - x / y / 2) : x / (Math.exp(x / y) - 1));

function tasas(V, desplNa = 0) {
  const v = V - VT - desplNa;
  const am = 0.32 * efrac(-(v - 13), 4);
  const bm = 0.28 * efrac(v - 40, 5);
  const ah = 0.128 * Math.exp(-(v - 17) / 18);
  const bh = 4 / (1 + Math.exp(-(v - 40) / 5));
  const vn = V - VT;
  const an = 0.032 * efrac(-(vn - 15), 5);
  const bn = 0.5 * Math.exp(-(vn - 10) / 40);
  return { am, bm, ah, bh, an, bn };
}

export const MOD_BASE = {
  gabaAmp: 1, gabaTau: 1, gabaTonico: 0, excLiberacion: 1, ampa: 1, nmda: 1, girk: 0, k2p: 0,
  naBloqueo: 0, naUso: 0, naLenta: 0, tBloqueo: 0, despNa: 0, corriente: 0, nicBloqueo: 0, nicSostenido: 0,
};

export class Neurona {
  constructor(tipo = 'cortical') {
    this.tipo = tipo;
    this.V = tipo === 'talamica' ? -72 : -70;
    const r = tasas(this.V);
    this.m = r.am / (r.am + r.bm);
    this.h = r.ah / (r.ah + r.bh);
    this.n = r.an / (r.an + r.bn);
    this.p = 0.03;
    this.hT = 0.6;
    this.gE = 0; this.gN = 0; this.gI = 0; this.gNic = 0;
    this.bUso = 0;   // fracción de canales de Na⁺ con fármaco (uso-dependiente)
    this.lenta = 0;  // inactivación lenta (lacosamida)
    this.ultimoPico = -1e9;
    this.picos = [];
    this.t = 0;
    this.gL = 0.0205;
    this.gT = tipo === 'talamica' ? 1.8 : 0;
    // en la neurona talámica la inhibición del núcleo reticular (GABA-A + GABA-B)
    // hiperpolariza más: así se desinactiva el canal T
    this.eInh = tipo === 'talamica' ? -88 : E.Cl;
    if (tipo === 'talamica') this.gL = 0.03;
  }

  // Avanza dt ms. ent: entradas sinápticas de este paso; mod: moduladores.
  paso(dt, ent, mod) {
    const V = this.V;
    // sinapsis: incrementos instantáneos y decaimiento exponencial
    this.gE += ent.exc * mod.ampa * 0.012;
    this.gN += ent.exc * mod.nmda * 0.006;
    this.gI += ent.inh * mod.gabaAmp * 0.016;
    this.gNic += ent.nic * 0.5 * (1 - mod.nicBloqueo);
    this.gE *= Math.exp(-dt / 3);
    this.gN *= Math.exp(-dt / 60);
    this.gI *= Math.exp(-dt / (9 * mod.gabaTau));
    this.gNic *= Math.exp(-dt / 2.5);
    const r = tasas(V, mod.despNa);
    // compuertas (Euler exponencial)
    const mInf = r.am / (r.am + r.bm), tm = 1 / (r.am + r.bm);
    const hInf = r.ah / (r.ah + r.bh), th = 1 / (r.ah + r.bh);
    const nInf = r.an / (r.an + r.bn), tn = 1 / (r.an + r.bn);
    this.m = mInf + (this.m - mInf) * Math.exp(-dt / tm);
    this.h = hInf + (this.h - hInf) * Math.exp(-dt / th);
    this.n = nInf + (this.n - nInf) * Math.exp(-dt / tn);
    const pInf = 1 / (1 + Math.exp(-(V + 35) / 10));
    const tp = 608 / (3.3 * Math.exp((V + 35) / 20) + Math.exp(-(V + 35) / 20));
    this.p = pInf + (this.p - pInf) * Math.exp(-dt / tp);
    // bloqueo dependiente del uso: el fármaco se une al canal inactivado (1-h)
    if (mod.naUso > 0) {
      const kon = 0.02 * mod.naUso, koff = 0.004;
      this.bUso += dt * (kon * (1 - this.h) * (1 - this.bUso) * 6 - koff * this.bUso * this.h);
      this.bUso = Math.min(0.97, Math.max(0, this.bUso));
    } else this.bUso *= Math.exp(-dt / 200);
    if (mod.naLenta > 0) {
      const objetivo = V > -60 ? mod.naLenta : 0;
      this.lenta += (objetivo - this.lenta) * dt / (V > -60 ? 120 : 900);
    } else this.lenta *= Math.exp(-dt / 400);
    // canal T de Ca²⁺ (neurona talámica)
    let iT = 0;
    if (this.gT > 0) {
      const Vx = 2;
      const mT = 1 / (1 + Math.exp(-(V + Vx + 57) / 6.2));
      const hTi = 1 / (1 + Math.exp((V + Vx + 81) / 4));
      const tauh = (30.8 + (211.4 + Math.exp((V + Vx + 113.2) / 5)) / (1 + Math.exp((V + Vx + 84) / 3.2))) / 3.7372;
      this.hT = hTi + (this.hT - hTi) * Math.exp(-dt / tauh);
      iT = this.gT * (1 - mod.tBloqueo) * mT * mT * this.hT * (V - E.Ca);
    }
    const gNaEf = 56 * (1 - mod.naBloqueo) * (1 - this.bUso) * (1 - this.lenta);
    const iNa = gNaEf * this.m ** 3 * this.h * (V - E.Na);
    const iK = 6 * this.n ** 4 * (V - E.K);
    const iM = 0.075 * this.p * (V - E.K);
    const iL = this.gL * (V - E.L);
    const mg = 1 / (1 + Math.exp(-0.062 * V) / 3.57);
    const iSin = this.gE * (V - E.exc) + this.gN * mg * (V - E.exc) + this.gI * (V - this.eInh) + mod.gabaTonico * (V - E.Cl);
    const iExtra = (mod.girk + mod.k2p) * (V - E.K) + (this.gNic + mod.nicSostenido) * (V - E.exc);
    const iApl = (ent.i || 0) + mod.corriente;
    this.V += dt * (iApl - iNa - iK - iM - iL - iSin - iExtra - iT);
    this.t += dt;
    this.corrientes = { iNa, iK, iCl: this.gI * (V - this.eInh) + mod.gabaTonico * (V - E.Cl), iT };
    if (this.V > -10 && V <= -10 && this.t - this.ultimoPico > 1.5) {
      this.ultimoPico = this.t;
      this.picos.push(this.t);
    }
    if (!(this.V > -150 && this.V < 100)) this.V = -70; // salvaguarda numérica
    return this.V;
  }

  frecuencia(ventana = 1000) {
    const t0 = this.t - ventana;
    while (this.picos.length && this.picos[0] < t0 - 2000) this.picos.shift();
    return this.picos.filter((p) => p >= t0).length * (1000 / ventana);
  }
}

// Fibra (axón) amielínica discretizada para ver la propagación y el bloqueo
// por anestésicos locales en un segmento.
export class Axon {
  constructor(n = 70) {
    this.n = n;
    this.neuronas = Array.from({ length: n }, () => new Neurona('cortical'));
    for (const c of this.neuronas) c.gL = 0.1;
    this.V = new Float32Array(n).fill(-70);
    this.acople = 2.2;
    this.t = 0;
    this.llegadas = [];
  }

  paso(dt, estimular, bloqueoSegmento, desde, hasta) {
    const n = this.n;
    const Vs = this.neuronas.map((c) => c.V);
    for (let i = 0; i < n; i++) {
      const c = this.neuronas[i];
      const izq = i > 0 ? Vs[i - 1] : Vs[i];
      const der = i < n - 1 ? Vs[i + 1] : Vs[i];
      const iAx = this.acople * (izq + der - 2 * Vs[i]);
      const mod = { ...MOD_BASE, naBloqueo: i >= desde && i <= hasta ? bloqueoSegmento : 0 };
      c.paso(dt, { exc: 0, inh: 0, nic: 0, i: iAx + (i < 3 && estimular ? 160 : 0) }, mod);
      this.V[i] = c.V;
    }
    this.t += dt;
  }
}
