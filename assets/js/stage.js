/*
 * Escenario animado «Opioides» (1920×1080).
 *
 * Es determinista: dibujar(t) solo depende de t, en segundos de la banda
 * sonora. La página interactiva lo sincroniza con el audio y video/render.py
 * lo recorre fotograma a fotograma para producir el vídeo de YouTube.
 *
 * Requiere window.DATOS (assets/js/datos.js, generado por
 * scripts/construir_datos.py).
 */
(function (global) {
  'use strict';

  const W = 1920, H = 1080;

  const P = {
    ink: '#F3EEF8', muted: '#A99FC0', dim: '#6E6487', line: 'rgba(243,238,248,0.16)',
    panel: 'rgba(33,24,52,0.82)', panelEdge: 'rgba(205,182,255,0.28)',
    accent: '#CDB6FF', drug: '#E9DDFF',
    mu: '#FF7B6B', delta: '#F2C14E', kappa: '#3FC9B0', nop: '#B69CFF',
    k: '#7FB2FF', ca: '#FF9A4D', nt: '#FFD9A8',
    O: '#FF9B8F', N: '#8FB6FF', pod: '#93BBA9', latex: '#F4EFE4',
  };
  const F = {
    display: '"Bricolage Grotesque", "Arial Narrow", system-ui, sans-serif',
    body: '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif',
    greek: '"Noto Serif Display", "Noto Serif", Georgia, serif',
    mono: '"JetBrains Mono", ui-monospace, "DejaVu Sans Mono", monospace',
  };

  // ------------------------------------------------------------ utilidades
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const eOut = x => 1 - Math.pow(1 - x, 3);
  const eInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const TAU = Math.PI * 2;

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function fuente(ctx, o) {
    ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 400} ${o.size || 40}px ${o.family || F.body}`;
    if ('fontStretch' in ctx) ctx.fontStretch = o.stretch || 'normal';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls || 0) + 'px';
  }

  function txt(ctx, s, x, y, o = {}) {
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    fuente(ctx, o);
    ctx.fillStyle = o.color || P.ink;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 24; }
    ctx.fillText(s, x, y);
    const w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  }

  function medir(ctx, s, o) { ctx.save(); fuente(ctx, o); const w = ctx.measureText(s).width; ctx.restore(); return w; }

  function lineas(ctx, s, maxW, o) {
    const out = [];
    for (const parrafo of String(s).split('\n')) {
      let linea = '';
      for (const pal of parrafo.split(' ')) {
        const prueba = linea ? linea + ' ' + pal : pal;
        if (linea && medir(ctx, prueba, o) > maxW) { out.push(linea); linea = pal; } else linea = prueba;
      }
      out.push(linea);
    }
    return out;
  }

  function parrafo(ctx, s, x, y, maxW, o = {}) {
    const lh = o.lh || (o.size || 40) * 1.28;
    const ls = lineas(ctx, s, maxW, o);
    ls.forEach((l, i) => txt(ctx, l, x, y + i * lh, o));
    return ls.length * lh;
  }

  function caja(ctx, x, y, w, h, r, fill, stroke, lw = 2) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }

  function brillo(ctx, x, y, r, color, a) {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(color, 0.55 * a));
    g.addColorStop(0.45, hexA(color, 0.22 * a));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  function punto(ctx, x, y, r, color, a = 1) {
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }

  function flecha(ctx, x1, y1, x2, y2, color, lw = 3, cabeza = 14) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(ang) * cabeza * 0.6, y2 - Math.sin(ang) * cabeza * 0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(ang - 0.45) * cabeza, y2 - Math.sin(ang - 0.45) * cabeza);
    ctx.lineTo(x2 - Math.cos(ang + 0.45) * cabeza, y2 - Math.sin(ang + 0.45) * cabeza);
    ctx.closePath(); ctx.fill();
  }

  // Etiqueta «PRECISIÓN» con texto: el sello visual de las aclaraciones.
  function precision(ctx, x, y, w, titulo, texto, a, o = {}) {
    if (a <= 0) return 0;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(0, (1 - eOut(a)) * 18);
    const size = o.size || 28;
    const ls = lineas(ctx, texto, w - 56, { size, family: F.body });
    const h = 76 + ls.length * size * 1.3 + (titulo ? size * 1.5 : 0);
    caja(ctx, x, y, w, h, 18, P.panel, P.panelEdge, 2);
    ctx.fillStyle = P.accent;
    ctx.fillRect(x + 28, y + 30, 10, 10);
    txt(ctx, 'PRECISIÓN', x + 50, y + 42, { family: F.mono, size: 20, weight: 600, color: P.accent, ls: 4 });
    let yy = y + 42 + size * 1.45;
    if (titulo) { txt(ctx, titulo, x + 28, yy, { family: F.display, weight: 700, size: size * 1.12 }); yy += size * 1.45; }
    ls.forEach((l, i) => txt(ctx, l, x + 28, yy + i * size * 1.3, { size, color: P.ink }));
    ctx.restore();
    return h;
  }

  // ------------------------------------------------------------ moléculas
  function prepararMolecula(m) {
    const at = m.atoms.map(a => ({ ...a }));
    const lon = m.bonds.map(b => Math.hypot(at[b.a].x - at[b.b].x, at[b.a].y - at[b.b].y)).sort((a, b) => a - b);
    const med = lon[Math.floor(lon.length / 2)];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    at.forEach(a => { x0 = Math.min(x0, a.x); x1 = Math.max(x1, a.x); y0 = Math.min(y0, a.y); y1 = Math.max(y1, a.y); });
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    at.forEach(a => { a.x = (a.x - cx) / med; a.y = (a.y - cy) / med; });
    const vec = at.map(() => []);
    m.bonds.forEach((b, i) => { vec[b.a].push([b.b, i]); vec[b.b].push([b.a, i]); });
    at.forEach((a, i) => {
      if (a.el === 'C') { a.label = null; return; }
      a.label = a.el;
      const mx = vec[i].reduce((s, [j]) => s + at[j].x, 0) / Math.max(1, vec[i].length);
      a.hLado = mx > a.x ? -1 : 1;   // H al lado contrario de los vecinos
    });
    // Orden de dibujo: recorrido en anchura desde el átomo 0.
    const orden = [], dir = [], visto = new Set([0]), cola = [0], usado = new Set();
    while (cola.length) {
      const u = cola.shift();
      for (const [v, bi] of vec[u]) {
        if (usado.has(bi)) continue;
        usado.add(bi); orden.push(bi); dir.push(m.bonds[bi].a === u ? 1 : -1);
        if (!visto.has(v)) { visto.add(v); cola.push(v); }
      }
    }
    const aparece = at.map(() => Infinity);
    orden.forEach((bi, k) => { const b = m.bonds[bi]; aparece[b.a] = Math.min(aparece[b.a], k); aparece[b.b] = Math.min(aparece[b.b], k); });
    aparece[0] = 0;
    const bonds = m.bonds.map(b => ({ ...b, ring: b.ring ? [(b.ring[0] - cx) / med, (b.ring[1] - cy) / med] : null }));
    return { ...m, at, bonds, orden, dir, aparece, ancho: (x1 - x0) / med, alto: (y1 - y0) / med };
  }

  function dibujarMolecula(ctx, M, x, y, s, o = {}) {
    const p = o.p == null ? 1 : o.p;
    const n = M.orden.length, nd = p * n;
    const color = o.color || P.ink;
    const lw = o.lw || Math.max(1.6, s * 0.05);
    const px = i => x + M.at[i].x * s, py = i => y + M.at[i].y * s;
    const fs = s * 0.46;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    if (o.anillos) {
      M.anillos.forEach((r, i) => {
        const f = typeof o.anillos === 'function' ? o.anillos(i) : o.anillos;
        if (f <= 0) return;
        ctx.save();
        ctx.globalAlpha *= 0.26 * f;
        ctx.fillStyle = o.colorAnillo || P.accent;
        ctx.beginPath();
        r.forEach((ai, j) => (j ? ctx.lineTo(px(ai), py(ai)) : ctx.moveTo(px(ai), py(ai))));
        ctx.closePath(); ctx.fill();
        ctx.restore();
      });
    }
    if (o.brillos) {
      for (const g of o.brillos) {
        if (!g.a) continue;
        for (const ai of g.atomos) brillo(ctx, px(ai), py(ai), s * (g.r || 0.95), g.color, g.a);
      }
    }

    const acorte = i => {
      const a = M.at[i];
      if (!a.label) return 0;
      return a.el === 'H' ? fs * 0.52 : fs * 0.62;
    };

    M.orden.forEach((bi, k) => {
      const f = clamp(nd - k);
      if (f <= 0) return;
      const b = M.bonds[bi];
      let i = b.a, j = b.b;
      if (M.dir[k] < 0) { i = b.b; j = b.a; }
      let x1 = px(i), y1 = py(i), x2 = px(j), y2 = py(j);
      const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      const c1 = acorte(i), c2 = acorte(j);
      x1 += ux * c1; y1 += uy * c1; x2 -= ux * c2; y2 -= uy * c2;
      const ex = lerp(x1, x2, f), ey = lerp(y1, y2, f);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;

      if (b.s === 'wedge' || b.s === 'hash') {
        // La punta estrecha está siempre en el átomo inicial RDKit (b.a).
        let ax = px(b.a), ay = py(b.a), bx = px(b.b), by = py(b.b);
        const ca = acorte(b.a), cb = acorte(b.b);
        const vx = (bx - ax) / L, vy = (by - ay) / L;
        ax += vx * ca; ay += vy * ca; bx -= vx * cb; by -= vy * cb;
        const nx = -vy, ny = vx, ancho = s * 0.13;
        ctx.save(); ctx.globalAlpha *= f;
        if (b.s === 'wedge') {
          ctx.beginPath(); ctx.moveTo(ax, ay);
          ctx.lineTo(bx + nx * ancho, by + ny * ancho); ctx.lineTo(bx - nx * ancho, by - ny * ancho);
          ctx.closePath(); ctx.fill();
        } else {
          const nl = 7;
          ctx.lineWidth = lw * 0.8;
          for (let q = 0; q <= nl; q++) {
            const tq = q / nl, qx = lerp(ax, bx, tq), qy = lerp(ay, by, tq), w2 = ancho * tq + 1;
            ctx.beginPath(); ctx.moveTo(qx + nx * w2, qy + ny * w2); ctx.lineTo(qx - nx * w2, qy - ny * w2); ctx.stroke();
          }
        }
        ctx.restore();
        return;
      }

      if (!(b.o >= 2 && !b.ring)) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke(); }
      if (b.o >= 2) {
        let nx = -uy, ny = ux;
        if (b.ring) {
          const rx = x + b.ring[0] * s, ry = y + b.ring[1] * s;
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          if ((rx - mx) * nx + (ry - my) * ny < 0) { nx = -nx; ny = -ny; }
          const d = s * 0.17, sh = 0.16;
          const ax = lerp(x1, x2, sh) + nx * d, ay = lerp(y1, y2, sh) + ny * d;
          const bx = lerp(x1, x2, 1 - sh) + nx * d, by = lerp(y1, y2, 1 - sh) + ny * d;
          if (f > sh) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, clamp((f - sh) / (1 - 2 * sh))), lerp(ay, by, clamp((f - sh) / (1 - 2 * sh)))); ctx.stroke(); }
        } else {
          const d = s * 0.1;
          ctx.beginPath(); ctx.moveTo(x1 + nx * d, y1 + ny * d); ctx.lineTo(ex + nx * d, ey + ny * d); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x1 - nx * d, y1 - ny * d); ctx.lineTo(ex - nx * d, ey - ny * d); ctx.stroke();
        }
      }
    });

    M.at.forEach((a, i) => {
      if (!a.label) return;
      const f = clamp(nd - M.aparece[i] - 0.3);
      if (f <= 0) return;
      const col = a.el === 'O' ? P.O : a.el === 'N' ? P.N : a.el === 'H' ? P.muted : color;
      const size = a.el === 'H' ? fs * 0.86 : fs;
      txt(ctx, a.el, px(i), py(i), { size, weight: 700, family: F.body, align: 'center', base: 'middle', color: col, alpha: f });
      if (a.el !== 'H' && a.h > 0) {
        const hx = px(i) + a.hLado * size * 0.78;
        txt(ctx, 'H', hx, py(i), { size, weight: 700, family: F.body, align: 'center', base: 'middle', color: col, alpha: f });
        if (a.h > 1) txt(ctx, String(a.h), hx + a.hLado * size * 0.55, py(i) + size * 0.3, { size: size * 0.6, weight: 700, align: 'center', base: 'middle', color: col, alpha: f });
      }
    });
    ctx.restore();
  }

  // ----------------------------------------------------- sistema nervioso
  const REGIONES = [
    { id: 'talamo', nombre: 'Tálamo', u: 0.52, v: 0.47 },
    { id: 'sgpa', nombre: 'Sustancia gris periacueductal', u: 0.585, v: 0.575 },
    { id: 'atv', nombre: 'Área tegmental ventral', u: 0.545, v: 0.625 },
    { id: 'lc', nombre: 'Locus coeruleus', u: 0.628, v: 0.70 },
    { id: 'bulbo', nombre: 'Bulbo raquídeo (respiración)', u: 0.603, v: 0.88 },
  ];
  const PERIFERIA = [
    { id: 'medula', nombre: 'Médula espinal · asta dorsal', u: 0.615, v: 1.12 },
    { id: 'nervio', nombre: 'Nervios periféricos', u: 0.92, v: 1.30 },
    { id: 'intestino', nombre: 'Intestino · plexo mientérico', u: 0.30, v: 1.26 },
  ];

  function dibujarSNC(ctx, x0, y0, Wb, o = {}) {
    const Hb = Wb * 0.8;
    const X = u => x0 + u * Wb, Y = v => y0 + v * Hb;
    const p = o.p == null ? 1 : o.p;
    const col = o.color || P.accent;
    ctx.save();
    ctx.lineWidth = o.lw || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    const cerebro = new Path2D();
    cerebro.moveTo(X(0.10), Y(0.62));
    cerebro.bezierCurveTo(X(0.02), Y(0.45), X(0.06), Y(0.20), X(0.28), Y(0.10));
    cerebro.bezierCurveTo(X(0.45), Y(0.01), X(0.70), Y(0.02), X(0.84), Y(0.14));
    cerebro.bezierCurveTo(X(0.97), Y(0.25), X(1.00), Y(0.46), X(0.93), Y(0.58));
    cerebro.bezierCurveTo(X(0.88), Y(0.65), X(0.80), Y(0.66), X(0.74), Y(0.62));
    cerebro.bezierCurveTo(X(0.68), Y(0.66), X(0.62), Y(0.62), X(0.58), Y(0.61));
    cerebro.bezierCurveTo(X(0.48), Y(0.74), X(0.34), Y(0.76), X(0.24), Y(0.71));
    cerebro.bezierCurveTo(X(0.17), Y(0.70), X(0.12), Y(0.67), X(0.10), Y(0.62));
    cerebro.closePath();

    const cerebelo = new Path2D();
    cerebelo.ellipse(X(0.80), Y(0.715), Wb * 0.115, Hb * 0.085, -0.15, 0, TAU);

    const tronco = new Path2D();
    tronco.moveTo(X(0.535), Y(0.60));
    tronco.bezierCurveTo(X(0.53), Y(0.66), X(0.505), Y(0.70), X(0.525), Y(0.765));
    tronco.bezierCurveTo(X(0.545), Y(0.82), X(0.578), Y(0.88), X(0.588), Y(0.98));
    tronco.lineTo(X(0.638), Y(0.98));
    tronco.bezierCurveTo(X(0.64), Y(0.90), X(0.648), Y(0.84), X(0.664), Y(0.78));
    tronco.bezierCurveTo(X(0.672), Y(0.70), X(0.635), Y(0.64), X(0.628), Y(0.60));
    tronco.closePath();

    const medula = new Path2D();
    medula.moveTo(X(0.588), Y(0.98));
    medula.bezierCurveTo(X(0.59), Y(1.12), X(0.595), Y(1.25), X(0.60), Y(1.36));
    medula.lineTo(X(0.632), Y(1.36));
    medula.bezierCurveTo(X(0.63), Y(1.25), X(0.636), Y(1.12), X(0.638), Y(0.98));

    ctx.save();
    ctx.globalAlpha *= clamp(p * 1.4);
    ctx.fillStyle = hexA(col, 0.07);
    ctx.fill(cerebro); ctx.fill(cerebelo); ctx.fill(tronco);
    ctx.restore();

    // Trazado progresivo con líneas discontinuas.
    const trazar = (path, largo, f) => {
      if (f <= 0) return;
      ctx.save();
      ctx.setLineDash([largo * f, largo]);
      ctx.strokeStyle = col; ctx.stroke(path);
      ctx.restore();
    };
    trazar(cerebro, Wb * 3.2, clamp(p * 1.3));
    trazar(cerebelo, Wb * 0.8, clamp(p * 1.6 - 0.4));
    trazar(tronco, Wb * 1.2, clamp(p * 1.6 - 0.45));
    trazar(medula, Wb * 1.2, clamp(p * 1.8 - 0.8));

    // Surcos y cuerpo calloso (textura).
    ctx.save();
    ctx.globalAlpha *= 0.45 * clamp(p * 1.5 - 0.5);
    ctx.strokeStyle = col; ctx.lineWidth = (o.lw || 3) * 0.7;
    const surcos = [
      [0.16, 0.36, 0.24, 0.26, 0.33, 0.30], [0.30, 0.18, 0.38, 0.24, 0.42, 0.15],
      [0.50, 0.10, 0.52, 0.20, 0.60, 0.24], [0.66, 0.12, 0.66, 0.22, 0.76, 0.26],
      [0.82, 0.30, 0.88, 0.36, 0.92, 0.46], [0.22, 0.52, 0.30, 0.56, 0.40, 0.56],
      [0.74, 0.44, 0.82, 0.48, 0.86, 0.54],
    ];
    for (const s of surcos) { ctx.beginPath(); ctx.moveTo(X(s[0]), Y(s[1])); ctx.quadraticCurveTo(X(s[2]), Y(s[3]), X(s[4]), Y(s[5])); ctx.stroke(); }
    ctx.beginPath();
    ctx.moveTo(X(0.30), Y(0.43)); ctx.bezierCurveTo(X(0.36), Y(0.30), X(0.64), Y(0.29), X(0.72), Y(0.41));
    ctx.bezierCurveTo(X(0.64), Y(0.35), X(0.40), Y(0.36), X(0.34), Y(0.45));
    ctx.stroke();
    for (let q = 0; q < 6; q++) {
      const a0 = -0.9 + q * 0.32;
      ctx.beginPath();
      ctx.moveTo(X(0.80) + Math.cos(a0) * Wb * 0.02, Y(0.715) + Math.sin(a0) * Hb * 0.02);
      ctx.lineTo(X(0.80) + Math.cos(a0) * Wb * 0.10, Y(0.715) + Math.sin(a0) * Hb * 0.075);
      ctx.stroke();
    }
    ctx.restore();

    // Nervios periféricos e intestino (solo cuando se piden).
    const pf = o.periferia || 0;
    if (pf > 0) {
      ctx.save();
      ctx.globalAlpha *= pf;
      ctx.strokeStyle = col; ctx.lineWidth = (o.lw || 3) * 0.8;
      const ramas = [[1.06, 0.93, 1.13], [1.18, 0.95, 1.30], [1.06, 0.30, 1.18], [1.20, 0.32, 1.26]];
      for (const [v, u2, v2] of ramas) {
        ctx.beginPath(); ctx.moveTo(X(0.615), Y(v));
        ctx.bezierCurveTo(X(lerp(0.615, u2, 0.4)), Y(v + 0.02), X(lerp(0.615, u2, 0.7)), Y(v2 - 0.03), X(u2), Y(v2));
        ctx.stroke();
      }
      // Intestino: tubo enrollado.
      ctx.lineWidth = (o.lw || 3) * 1.1;
      ctx.beginPath();
      const gx = X(0.30), gy = Y(1.26), r = Wb * 0.07;
      for (let q = 0; q <= 90; q++) {
        const a = q / 90 * TAU * 2.2, rr = r * (0.35 + 0.65 * q / 90);
        const xx = gx + Math.cos(a) * rr, yy = gy + Math.sin(a) * rr * 0.7;
        q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
      ctx.restore();
    }

    const pos = {};
    for (const r of REGIONES.concat(PERIFERIA)) pos[r.id] = [X(r.u), Y(r.v)];
    ctx.restore();
    return pos;
  }

  function marcaRegion(ctx, x, y, a, color, t, grande) {
    if (a <= 0) return;
    const pulso = 0.5 + 0.5 * Math.sin(t * 4);
    brillo(ctx, x, y, (grande ? 56 : 42) * (0.8 + 0.2 * pulso), color, a);
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, 13 + 5 * pulso, 0, TAU); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // -------------------------------------------------- membrana y receptor
  function dibujarMembrana(ctx, x1, x2, yA, yB, huecos, a = 1, t = 0) {
    ctx.save();
    ctx.globalAlpha *= a;
    const paso = 27, r = 10.5;
    const libre = x => !huecos.some(([h0, h1]) => x > h0 - r && x < h1 + r);
    ctx.strokeStyle = 'rgba(205,182,255,0.35)'; ctx.lineWidth = 2;
    for (let x = x1; x <= x2; x += paso) {
      if (!libre(x)) continue;
      const w = Math.sin(x * 0.05 + t * 1.2) * 2;
      for (const [y, s] of [[yA, 1], [yB, -1]]) {
        ctx.beginPath(); ctx.moveTo(x - 4, y + s * r); ctx.quadraticCurveTo(x - 7 + w, y + s * (r + 20), x - 4, y + s * (r + 36)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 4, y + s * r); ctx.quadraticCurveTo(x + 7 - w, y + s * (r + 20), x + 4, y + s * (r + 36)); ctx.stroke();
      }
    }
    for (let x = x1; x <= x2; x += paso) {
      if (!libre(x)) continue;
      for (const y of [yA, yB]) {
        const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, r);
        g.addColorStop(0, '#E7DBFF'); g.addColorStop(1, '#8E78C4');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  // Receptor acoplado a proteína G: 7 hélices transmembrana.
  function dibujarGPCR(ctx, cx, yA, yB, color, a = 1, esc = 1, t = 0) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    const n = 7, ancho = 36 * esc, sep = 46 * esc;
    const x0 = cx - (sep * (n - 1)) / 2;
    const top = yA - 22 * esc, bot = yB + 22 * esc;
    ctx.lineWidth = 3.5 * esc; ctx.strokeStyle = hexA(color, 0.9); ctx.lineCap = 'round';
    // Extremo N (extracelular) y C (intracelular, con hélice 8).
    ctx.beginPath(); ctx.moveTo(x0, top); ctx.bezierCurveTo(x0 - 20 * esc, top - 60 * esc, x0 - 70 * esc, top - 40 * esc, x0 - 90 * esc, top - 70 * esc); ctx.stroke();
    const xl = x0 + sep * (n - 1);
    ctx.beginPath(); ctx.moveTo(xl, bot); ctx.bezierCurveTo(xl + 20 * esc, bot + 30 * esc, xl + 60 * esc, bot + 26 * esc, xl + 90 * esc, bot + 44 * esc); ctx.stroke();
    // Bucles: 1→2 intracelular, 2→3 extracelular, ...
    for (let i = 0; i < n - 1; i++) {
      const xa = x0 + i * sep, xb = xa + sep;
      const abajo = i % 2 === 0;
      const y = abajo ? bot : top, d = (abajo ? 1 : -1) * (26 + (i === 3 ? 18 : 0)) * esc;
      ctx.beginPath(); ctx.moveTo(xa, y); ctx.bezierCurveTo(xa, y + d, xb, y + d, xb, y); ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      const x = x0 + i * sep;
      const g = ctx.createLinearGradient(x - ancho / 2, 0, x + ancho / 2, 0);
      g.addColorStop(0, hexA(color, 0.95)); g.addColorStop(0.5, hexA(color, 0.7)); g.addColorStop(1, hexA(color, 0.45));
      ctx.save();
      ctx.translate(x, (top + bot) / 2);
      ctx.rotate((i % 2 ? -1 : 1) * 0.06);
      caja(ctx, -ancho / 2, -(bot - top) / 2, ancho, bot - top, ancho / 2, g);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
      for (let k = 1; k < 7; k++) {
        const yy = -(bot - top) / 2 + k * (bot - top) / 7;
        ctx.beginPath(); ctx.moveTo(-ancho / 2 + 5, yy - 5); ctx.lineTo(ancho / 2 - 5, yy + 5); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // Icono compacto de receptor (para la sinapsis).
  function receptorMini(ctx, x, y, color, a = 1, invertido = false) {
    ctx.save(); ctx.globalAlpha *= a;
    for (let i = 0; i < 4; i++) {
      caja(ctx, x - 30 + i * 16, y - 24, 12, 48, 6, hexA(color, 0.9 - i * 0.12));
    }
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath();
    const s = invertido ? -1 : 1;
    ctx.moveTo(x - 24, y - 26 * s); ctx.quadraticCurveTo(x, y - 44 * s, x + 24, y - 26 * s);
    ctx.stroke();
    ctx.restore();
  }

  // Ligando opioide: anillo con cola (icono, no estructura real).
  function ligando(ctx, x, y, r, a = 1, rot = 0) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.rotate(rot);
    brillo(ctx, 0, 0, r * 2.4, P.drug, 0.8);
    ctx.strokeStyle = P.drug; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(233,221,255,0.18)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + Math.PI / 6; i ? ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r) : ctx.moveTo(Math.cos(an) * r, Math.sin(an) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.87, r * 0.5); ctx.lineTo(r * 1.7, r * 1.0); ctx.lineTo(r * 2.3, r * 0.5); ctx.stroke();
    punto(ctx, r * 2.3, r * 0.5, 4.5, P.N);
    ctx.restore();
  }

  function proteinaG(ctx, x, y, esc, a, activa) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    const sep = activa * 46 * esc;
    ctx.fillStyle = hexA(P.accent, 0.85);
    ctx.beginPath(); ctx.ellipse(x - sep, y, 44 * esc, 34 * esc, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA(P.nop, 0.6);
    ctx.beginPath(); ctx.ellipse(x + 52 * esc + sep, y - 6 * esc, 28 * esc, 26 * esc, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA(P.muted, 0.7);
    ctx.beginPath(); ctx.ellipse(x + 84 * esc + sep, y - 22 * esc, 14 * esc, 12 * esc, 0, 0, TAU); ctx.fill();
    txt(ctx, 'Gα', x - sep, y + 9 * esc, { size: 26 * esc, weight: 700, align: 'center', color: '#20163A' });
    txt(ctx, 'βγ', x + 58 * esc + sep, y + 3 * esc, { size: 20 * esc, weight: 700, align: 'center', color: '#20163A' });
    ctx.restore();
  }

  // ------------------------------------------ potencial de membrana (modelo)
  // Modelo ilustrativo: EPSP periódicos sobre un reposo de −70 mV; el
  // opioide abre GIRK (el reposo tiende a −79 mV) y reduce la liberación
  // presináptica (EPSP ×0,45). Si el pico llega a −55 mV se dispara un PA
  // de forma idéntica antes y después.
  function modeloVm(t0, t1, opts) {
    const dt = 0.002, n = Math.ceil((t1 - t0) / dt) + 1;
    const v = new Float32Array(n);
    const { tOpi, tPre, periodo, primero } = opts;
    const base = t => (t < tOpi ? -70 : -70 - 9 * (1 - Math.exp(-(t - tOpi) / 0.6)));
    const amp = t => (t < tPre ? 18 : 18 * 0.45);
    const eventos = [];
    for (let te = primero; te < t1; te += periodo) eventos.push(te);
    const tau = 0.035;
    const picos = [];
    for (let i = 0; i < n; i++) {
      const t = t0 + i * dt;
      let x = base(t);
      for (const te of eventos) {
        const d = t - te;
        if (d > 0 && d < 0.4) x += amp(te) * (d / tau) * Math.exp(1 - d / tau);
      }
      v[i] = x;
    }
    // Potenciales de acción donde el EPSP alcanza el umbral.
    for (const te of eventos) {
      if (te < t0) continue;
      const pico = base(te + tau) + amp(te);
      if (pico >= -55) {
        picos.push(te + tau * 0.8);
        const i0 = Math.round((te + tau * 0.8 - t0) / dt);
        const forma = [-40, 10, 32, 18, -20, -62, -80, -79, -77, -75, -73.5, -72.5, -71.5];
        forma.forEach((val, k) => {
          if (i0 + k < n) v[i0 + k] = k < 6 ? val : Math.min(v[i0 + k], val + (base(te) + 70));
        });
      }
    }
    return { t0, dt, v, picos };
  }

  function dibujarTraza(ctx, M, x, y, w, h, tHasta, o = {}) {
    const vmin = -92, vmax = 40;
    const Y = mv => y + h - ((mv - vmin) / (vmax - vmin)) * h;
    const tEnd = M.t0 + (M.v.length - 1) * M.dt;
    const X = t => x + ((t - M.t0) / (tEnd - M.t0)) * w;
    ctx.save();
    // Ejes y referencias
    ctx.strokeStyle = P.line; ctx.lineWidth = 1.5;
    for (const [mv, et, c] of [[30, '+30', P.dim], [0, '0', P.dim], [-55, '−55 umbral', P.delta], [-70, '−70 reposo', P.muted]]) {
      ctx.save();
      if (mv === -55) { ctx.setLineDash([10, 8]); ctx.strokeStyle = hexA(P.delta, 0.7); }
      ctx.beginPath(); ctx.moveTo(x, Y(mv)); ctx.lineTo(x + w, Y(mv)); ctx.stroke();
      ctx.restore();
      txt(ctx, et, x - 14, Y(mv) + 7, { family: F.mono, size: o.fs || 19, color: c, align: 'right' });
    }
    txt(ctx, 'mV', x - 14, y - 12, { family: F.mono, size: o.fs || 19, color: P.dim, align: 'right' });
    if (o.tOpi != null && tHasta > o.tOpi) {
      ctx.save(); ctx.setLineDash([6, 8]); ctx.strokeStyle = hexA(P.drug, 0.7); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(o.tOpi), y - 6); ctx.lineTo(X(o.tOpi), y + h); ctx.stroke(); ctx.restore();
      txt(ctx, 'opioide', X(o.tOpi) + 10, y + 16, { family: F.mono, size: o.fs || 19, color: P.drug });
    }
    // Traza
    const nMax = Math.min(M.v.length, Math.floor((tHasta - M.t0) / M.dt));
    if (nMax > 1) {
      ctx.strokeStyle = o.color || P.k; ctx.lineWidth = o.lw || 3; ctx.lineJoin = 'round';
      ctx.shadowColor = hexA(o.color || P.k, 0.6); ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let i = 0; i < nMax; i++) {
        const xx = X(M.t0 + i * M.dt), yy = Y(M.v[i]);
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      punto(ctx, X(M.t0 + (nMax - 1) * M.dt), Y(M.v[nMax - 1]), 6, o.color || P.k);
    }
    ctx.restore();
    return M.picos.filter(p => p <= tHasta).length;
  }

  // ------------------------------------------------------------- neurona
  function dibujarNeurona(ctx, cx, cy, esc, p, color, semilla) {
    const rnd = mulberry(semilla);
    ctx.save();
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    const rama = (x, y, ang, largo, grosor, nivel) => {
      if (nivel > 4 || largo < 12) return;
      const f = clamp(p * 5 - nivel * 0.8);
      if (f <= 0) return;
      const x2 = x + Math.cos(ang) * largo * f, y2 = y + Math.sin(ang) * largo * f;
      ctx.lineWidth = grosor;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(ang + 0.3) * largo * 0.5 * f, y + Math.sin(ang + 0.3) * largo * 0.5 * f, x2, y2);
      ctx.stroke();
      if (f < 1) return;
      const nh = 2;
      for (let k = 0; k < nh; k++) rama(x2, y2, ang + (rnd() - 0.5) * 1.3, largo * (0.55 + rnd() * 0.2), grosor * 0.62, nivel + 1);
    };
    for (let k = 0; k < 6; k++) {
      const ang = Math.PI * 0.72 + k * 0.36 + (rnd() - 0.5) * 0.25;
      rama(cx + Math.cos(ang) * 40 * esc, cy + Math.sin(ang) * 40 * esc, ang, 120 * esc, 9 * esc, 0);
    }
    // Axón hacia la derecha
    const fa = clamp(p * 1.6 - 0.2);
    ctx.lineWidth = 10 * esc;
    ctx.beginPath(); ctx.moveTo(cx + 40 * esc, cy);
    ctx.bezierCurveTo(cx + 250 * esc, cy - 30 * esc, cx + 380 * esc * fa, cy + 60 * esc * fa, cx + 560 * esc * fa, cy + 20 * esc * fa);
    ctx.stroke();
    if (fa >= 1) {
      for (const d of [-0.6, 0, 0.6]) {
        const ex = cx + 560 * esc, ey = cy + 20 * esc;
        ctx.lineWidth = 5 * esc;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(d) * 70 * esc, ey + Math.sin(d) * 70 * esc); ctx.stroke();
        punto(ctx, ex + Math.cos(d) * 78 * esc, ey + Math.sin(d) * 78 * esc, 11 * esc, color);
      }
    }
    // Soma
    const g = ctx.createRadialGradient(cx - 12 * esc, cy - 12 * esc, 4, cx, cy, 52 * esc);
    g.addColorStop(0, '#EADFFF'); g.addColorStop(1, hexA(color, 0.9));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 52 * esc * clamp(p * 4), 0, TAU); ctx.fill();
    punto(ctx, cx + 6 * esc, cy + 4 * esc, 18 * esc * clamp(p * 4), '#3A2A5C');
    ctx.restore();
  }

  // --------------------------------------------------------- amapola
  function dibujarCapsula(ctx, cx, cy, h, p, t) {
    ctx.save();
    ctx.strokeStyle = P.pod; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const f1 = clamp(p * 2), f2 = clamp(p * 2 - 0.5), f3 = clamp(p * 2 - 1);
    // Tallo
    ctx.save(); ctx.setLineDash([h * 0.9 * f1, h * 2]);
    ctx.beginPath(); ctx.moveTo(cx, cy + h * 0.46); ctx.bezierCurveTo(cx + 6, cy + h * 0.7, cx - 20, cy + h * 0.95, cx - 8, cy + h * 1.2); ctx.stroke();
    ctx.restore();
    // Cuerpo globoso de la cápsula
    const cuerpo = new Path2D();
    cuerpo.moveTo(cx - h * 0.20, cy - h * 0.40);
    cuerpo.bezierCurveTo(cx - h * 0.40, cy - h * 0.34, cx - h * 0.47, cy - h * 0.08, cx - h * 0.42, cy + h * 0.12);
    cuerpo.bezierCurveTo(cx - h * 0.37, cy + h * 0.32, cx - h * 0.16, cy + h * 0.44, cx - h * 0.05, cy + h * 0.46);
    cuerpo.lineTo(cx + h * 0.05, cy + h * 0.46);
    cuerpo.bezierCurveTo(cx + h * 0.16, cy + h * 0.44, cx + h * 0.37, cy + h * 0.32, cx + h * 0.42, cy + h * 0.12);
    cuerpo.bezierCurveTo(cx + h * 0.47, cy - h * 0.08, cx + h * 0.40, cy - h * 0.34, cx + h * 0.20, cy - h * 0.40);
    cuerpo.closePath();
    const gc = ctx.createRadialGradient(cx - h * 0.15, cy - h * 0.1, h * 0.05, cx, cy, h * 0.5);
    gc.addColorStop(0, hexA(P.pod, 0.32)); gc.addColorStop(1, hexA(P.pod, 0.08));
    ctx.save(); ctx.globalAlpha *= f2; ctx.fillStyle = gc; ctx.fill(cuerpo); ctx.restore();
    ctx.save(); ctx.setLineDash([h * 2.8 * f1, h * 4]); ctx.stroke(cuerpo); ctx.restore();
    // Corona estigmática: disco plano con radios
    ctx.save(); ctx.globalAlpha *= f2;
    ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.43, h * 0.27, h * 0.055, 0, 0, TAU);
    ctx.fillStyle = hexA(P.pod, 0.35); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 2.2;
    for (let k = 0; k < 12; k++) {
      const an = k / 12 * TAU;
      ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.43);
      ctx.lineTo(cx + Math.cos(an) * h * 0.25, cy - h * 0.43 + Math.sin(an) * h * 0.048); ctx.stroke();
    }
    ctx.restore();
    // Cortes verticales de los que brota el látex (así se obtiene el opio)
    ctx.save(); ctx.globalAlpha *= f3;
    ctx.strokeStyle = P.latex; ctx.lineWidth = 2.5;
    [-0.2, 0.02, 0.22].forEach((dx, i) => {
      const x = cx + h * dx, y1 = cy - h * 0.24, y2 = cy + h * 0.16;
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.quadraticCurveTo(x + h * dx * 0.25, (y1 + y2) / 2, x - h * dx * 0.1, y2); ctx.stroke();
      ctx.fillStyle = P.latex;
      for (let q = 0; q < 4; q++) {
        const yy = lerp(y1, y2, (q + 0.5) / 4);
        ctx.beginPath(); ctx.arc(x + h * dx * 0.12 + 3, yy, 4.5, 0, TAU); ctx.fill();
      }
      const gota = ((t * 0.35 + i * 0.37) % 1);
      ctx.beginPath(); ctx.ellipse(x - h * dx * 0.1 + 2, y2 + 6 + gota * 22, 5, 6 + gota * 4, 0, 0, TAU); ctx.fill();
    });
    ctx.restore();
    ctx.restore();
  }

  function capsulaMed(ctx, x, y, w, h, c1, c2, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.clip();
    ctx.fillStyle = c1; ctx.fillRect(-w / 2, -h / 2, w / 2, h);
    ctx.fillStyle = c2; ctx.fillRect(0, -h / 2, w / 2, h);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-w / 2 + h * 0.3, -h / 2 + h * 0.16, w - h * 0.6, h * 0.14);
    ctx.restore();
  }

  // ====================================================================
  function crear(canvas, D) {
    const ctx = canvas.getContext('2d');
    const N = D.offsetNarracion;
    const A = a => a + N;
    const tA = D.tAclaraciones, tR = D.tResumen, TT = D.duracion;
    const MOL = {};
    D.moleculas.forEach(m => { MOL[m.id] = prepararMolecula(m); });
    const TARJ = D.tarjetas;

    // Subtítulos: bloques de palabras.
    const bloques = [];
    const trocear = (pal, voz, dudoso) => {
      let act = [];
      const cerrar = () => { if (act.length) bloques.push({ pal: act, t0: act[0].t0, t1: act[act.length - 1].t1, voz, dudoso }); act = []; };
      for (const w of pal) {
        act.push(w);
        const largo = act.map(p => p.w).join(' ').length;
        const u = w.w[w.w.length - 1];
        if ('.;:?!'.includes(u) || (u === ',' && largo > 26) || largo > 52) cerrar();
      }
      cerrar();
    };
    D.frases.forEach(f => trocear(f.palabras, 'original', f.dudoso));
    D.locuciones.forEach(l => trocear(l.palabras, 'sintetica', false));
    bloques.sort((a, b) => a.t0 - b.t0);
    bloques.forEach((b, i) => { b.hasta = Math.min(b.t1 + 0.7, bloques[i + 1] ? bloques[i + 1].t0 - 0.04 : Infinity); });

    // Tiempo de una palabra dentro de una locución (para sincronizar visuales).
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u00f1]/g, '');
    function tPalabra(loc, pal, n = 0) {
      if (!loc) return Infinity;
      const obj = norm(pal);
      let c = 0;
      for (const w of loc.palabras) if (norm(w.w).startsWith(obj)) { if (c === n) return w.t0; c++; }
      return Infinity;
    }
    const locDe = t0 => D.locuciones.find(l => Math.abs(l.ini - t0) < 0.05);

    // Grano y partículas (deterministas).
    const grano = document.createElement('canvas');
    grano.width = grano.height = 256;
    {
      const g = grano.getContext('2d'), img = g.createImageData(256, 256), r = mulberry(7);
      for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 10; }
      g.putImageData(img, 0, 0);
    }
    const patronGrano = ctx.createPattern(grano, 'repeat');
    const PART = [];
    { const r = mulberry(21); for (let i = 0; i < 46; i++) PART.push({ x: r() * W, y: r() * H, vx: (r() - 0.5) * 14, vy: -4 - r() * 10, s: 1.5 + r() * 3.5, a: 0.05 + r() * 0.12, f: r() * TAU }); }

    // Trazas del modelo de potencial de membrana.
    const trazaMec = modeloVm(A(52.2), A(62.6), { tOpi: A(54.6), tPre: A(55.2), periodo: 0.55, primero: A(52.35) });

    function fondo(t) {
      const g = ctx.createRadialGradient(W * 0.64, H * 0.08, 40, W * 0.5, H * 0.55, W * 0.85);
      g.addColorStop(0, '#2A1D40'); g.addColorStop(0.5, '#171026'); g.addColorStop(1, '#0B0812');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (const p of PART) {
        const x = ((p.x + t * p.vx) % W + W) % W, y = ((p.y + t * p.vy) % H + H) % H;
        punto(ctx, x, y, p.s, P.accent, p.a * (0.7 + 0.3 * Math.sin(t * 0.8 + p.f)));
      }
      ctx.save(); ctx.fillStyle = patronGrano; ctx.fillRect(0, 0, W, H); ctx.restore();
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }

    // ----------------------------------------------------------- escenas
    function intro(t) {
      txt(ctx, 'CLASE DE FARMACOLOGÍA', 150, 330, { family: F.mono, size: 26, weight: 600, color: P.muted, ls: 7, alpha: prog(t, 0.2, 0.8) });
      const titulo = 'Opioides';
      let x = 140;
      for (let i = 0; i < titulo.length; i++) {
        const f = eOut(prog(t, 0.35 + i * 0.07, 0.95 + i * 0.07));
        const w = txt(ctx, titulo[i], x, 560 + (1 - f) * 70, { family: F.display, size: 250, weight: 800, stretch: 'condensed', alpha: f, ls: -4 });
        x += w;
      }
      txt(ctx, 'Qué son · dónde actúan · cómo actúan', 150, 650, { size: 46, color: P.muted, alpha: prog(t, 1.2, 1.8) });
      const fl = prog(t, 1.8, 2.4);
      [['μ', P.mu], ['δ', P.delta], ['κ', P.kappa]].forEach(([l, c], i) => {
        const f = eBack(prog(t, 1.9 + i * 0.18, 2.5 + i * 0.18));
        ctx.save(); ctx.globalAlpha *= clamp(f);
        caja(ctx, 150 + i * 96, 700, 76, 76, 38, hexA(c, 0.14), hexA(c, 0.8), 2.5);
        txt(ctx, l, 188 + i * 96, 752, { family: F.greek, italic: true, weight: 700, size: 46, color: c, align: 'center' });
        ctx.restore();
      });
      txt(ctx, 'con aclaraciones rigurosas', 460, 750, { family: F.mono, size: 24, color: P.accent, alpha: fl, ls: 1 });
      const m = MOL.morfina;
      const p = eInOut(prog(t, 0.5, 3.6));
      brillo(ctx, 1420, 520, 380, P.accent, 0.35 * p);
      dibujarMolecula(ctx, m, 1420, 520, 84, { p, color: P.drug, lw: 4.5 });
      txt(ctx, 'Morfina', 1420, 870, { family: F.mono, size: 24, color: P.muted, align: 'center', alpha: prog(t, 3.0, 3.6), ls: 3 });
    }

    function medicamentos(t) {
      const a = t - N;
      const clases = ['Antibióticos', 'Antihipertensivos', 'Anticoagulantes', 'Antidepresivos', 'AINE',
        'Ansiolíticos', 'Antidiabéticos', 'Antihistamínicos', 'Anestésicos locales', 'Antivirales',
        'Diuréticos', 'Opioides', 'Antiepilépticos', 'Broncodilatadores', 'Estatinas'];
      const cols = [['#7FB2FF', '#DDE8FF'], ['#3FC9B0', '#D3F5EE'], ['#F2C14E', '#FFF1CC'], ['#FF9A4D', '#FFE2CC'], ['#B69CFF', '#EDE5FF']];
      const foco = 11;
      const fFoco = eInOut(prog(a, 5.55, 6.9));
      txt(ctx, 'Hoy hablaremos de', 150, 150, { size: 34, color: P.muted, alpha: prog(a, 1.8, 2.3) * (1 - fFoco) });
      txt(ctx, 'Medicamentos', 150, 215, { family: F.display, size: 72, weight: 750, alpha: prog(a, 2.6, 3.2) * (1 - fFoco) });
      clases.forEach((c, i) => {
        const col = i % 5, fila = Math.floor(i / 5);
        const x = 330 + col * 315, y = 360 + fila * 190;
        const f = eBack(prog(a, 1.9 + i * 0.1, 2.4 + i * 0.1));
        if (f <= 0) return;
        const [c1, c2] = i === foco ? [P.drug, P.accent] : cols[(i * 3) % 5];
        let alpha = clamp(f);
        let cx = x, cy = y, esc = f;
        if (i === foco) { cx = lerp(x, 420, fFoco); cy = lerp(y, 500, fFoco); esc = lerp(f, 2.3, fFoco); }
        else alpha *= 1 - fFoco;
        ctx.save(); ctx.globalAlpha *= alpha;
        if (i === foco && fFoco > 0) brillo(ctx, cx, cy, 200, P.accent, fFoco);
        capsulaMed(ctx, cx, cy, 150 * esc, 56 * esc, c1, c2, -0.22);
        txt(ctx, c, cx, cy + 64 * esc + 16, { family: F.mono, size: 21 * (i === foco ? lerp(1, 1.4, fFoco) : 1), color: i === foco ? P.ink : P.muted, align: 'center' });
        ctx.restore();
      });
      const fT = prog(a, 6.5, 7.2);
      if (fT > 0) {
        txt(ctx, 'Opioides', 700, 520 + (1 - eOut(fT)) * 30, { family: F.display, size: 170, weight: 800, stretch: 'condensed', alpha: fT });
        txt(ctx, 'opio + -oide: «semejante al opio»', 708, 590, { family: F.mono, size: 26, color: P.accent, alpha: prog(a, 7.2, 7.8) });
        dibujarCapsula(ctx, 1560, 430, 360, prog(a, 6.9, 8.6), t);
        const fc = prog(a, 8.0, 8.6);
        parrafo(ctx, 'Papaver somniferum (adormidera): el opio es el látex seco que brota de su cápsula inmadura cuando se le hacen cortes.', 708, 690, 560, { size: 27, color: P.muted, alpha: fc, lh: 36 });
      }
    }

    function sistema(t) {
      const a = t - N;
      const x0 = 250, y0 = 150, Wb = 700;
      const fP = prog(a, 18.8, 19.8);
      const pos = dibujarSNC(ctx, x0, y0, Wb, { p: eInOut(prog(a, 9.6, 12.6)), periferia: fP, lw: 3.2 });
      // Impulsos nerviosos recorriendo la médula.
      const fImp = prog(a, 11.5, 12.5);
      for (let k = 0; k < 4; k++) {
        const q = ((t * 0.55 + k * 0.25) % 1);
        const yy = lerp(y0 + 1.34 * Wb * 0.8, y0 + 0.62 * Wb * 0.8, q);
        punto(ctx, x0 + 0.614 * Wb, yy, 6, P.drug, fImp * Math.sin(q * Math.PI));
      }
      txt(ctx, 'UN GRUPO FARMACOLÓGICO QUE ACTÚA SOBRE EL', 1080, 260, { family: F.mono, size: 22, weight: 600, color: P.muted, ls: 3, alpha: prog(a, 10.0, 10.6) });
      txt(ctx, 'Sistema nervioso', 1074, 360, { family: F.display, size: 104, weight: 800, stretch: 'condensed', alpha: prog(a, 12.4, 13.1) });
      txt(ctx, 'en ciertos receptores del cerebro:', 1080, 440, { size: 32, color: P.muted, alpha: prog(a, 15.8, 16.3) });
      REGIONES.forEach((r, i) => {
        const f = prog(a, 16.3 + i * 0.45, 16.8 + i * 0.45);
        const [x, y] = pos[r.id];
        marcaRegion(ctx, x, y, f, P.accent, t + i);
        if (f > 0) {
          punto(ctx, 1092, 494 + i * 50, 7, P.accent, f);
          txt(ctx, r.nombre, 1114, 503 + i * 50, { size: 30, alpha: f });
        }
      });
      PERIFERIA.forEach((r, i) => {
        const f = prog(a, 19.0 + i * 0.3, 19.5 + i * 0.3);
        const [x, y] = pos[r.id];
        marcaRegion(ctx, x, y, f, P.kappa, t + i);
      });
      precision(ctx, 1080, 760, 740, null, 'También hay receptores opioides en la médula espinal, los nervios periféricos y el intestino.', fP, { size: 27 });
    }

    function molecula(t) {
      const a = t - N;
      const M = MOL.morfina;
      // Pregunta: centrada y luego arriba a la izquierda.
      const fq = prog(a, 20.9, 21.5), fm = eInOut(prog(a, 23.3, 24.1));
      txt(ctx, '¿Qué es un opioide?', lerp(W / 2, 150, fm), lerp(560, 190, fm), {
        family: F.display, size: lerp(140, 68, fm), weight: 800, align: fm < 0.5 ? 'center' : 'left', alpha: fq, stretch: 'condensed',
      });
      const fFam = eInOut(prog(a, 33.3, 34.3));
      const cx = lerp(720, 420, fFam), cy = lerp(560, 360, fFam), s = lerp(74, 36, fFam);
      const pDib = eInOut(prog(a, 23.75, 26.9));
      const fAn = i => prog(a, 28.3 + i * 0.5, 28.8 + i * 0.5) * (1 - 0.7 * fFam);
      const fFar = prog(a, 31.0, 31.6) * (1 - 0.4 * fFam);
      dibujarMolecula(ctx, M, cx, cy, s, {
        p: pDib, color: P.ink, lw: lerp(4, 2.6, fFam), anillos: fAn,
        brillos: [
          { atomos: M.grupos.fenol, color: P.kappa, a: fFar },
          { atomos: M.grupos.amina, color: P.mu, a: fFar, r: 1.3 },
        ],
      });
      // Panel derecho: ficha de la morfina.
      const fInfo = prog(a, 25.0, 25.6) * (1 - prog(a, 33.0, 33.5));
      if (fInfo > 0) {
        ctx.save(); ctx.globalAlpha *= fInfo;
        txt(ctx, 'Morfina', 1180, 330, { family: F.display, size: 88, weight: 800 });
        txt(ctx, `${M.formula.replace(/(\d+)/g, d => d.split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[c]).join(''))} · ${M.masa.toFixed(2).replace('.', ',')} g/mol`, 1184, 385, { family: F.mono, size: 28, color: P.accent });
        parrafo(ctx, 'Alcaloide del opio, aislado por Friedrich Sertürner hacia 1804.', 1184, 440, 620, { size: 29, color: P.muted, lh: 38 });
        const fr = prog(a, 28.2, 28.8);
        txt(ctx, 'Núcleo 4,5‑epoximorfinano', 1184, 560, { family: F.display, size: 44, weight: 700, alpha: fr });
        txt(ctx, '5 anillos fusionados · 5 centros quirales', 1184, 604, { size: 28, color: P.muted, alpha: fr });
        const ff = prog(a, 31.0, 31.6);
        punto(ctx, 1196, 682, 9, P.kappa, ff);
        txt(ctx, 'Fenol en el anillo aromático', 1218, 692, { size: 29, alpha: ff });
        punto(ctx, 1196, 732, 9, P.mu, ff);
        txt(ctx, 'Nitrógeno básico (protonado a pH 7,4)', 1218, 742, { size: 29, alpha: ff });
        txt(ctx, 'El farmacóforo que reconoce el receptor', 1184, 792, { family: F.mono, size: 22, color: P.accent, alpha: ff });
        ctx.restore();
      }
      // Familia: variaciones mínimas, funciones distintas.
      if (fFam > 0) {
        txt(ctx, 'Morfina', 420, 520, { family: F.display, size: 36, weight: 700, align: 'center', alpha: fFam });
        txt(ctx, 'referencia', 420, 550, { family: F.mono, size: 21, color: P.muted, align: 'center', alpha: fFam });
        const fam = [
          ['codeina', 'Codeína', '3‑O‑metil · profármaco', 980, 360],
          ['heroina', 'Heroína', '3,6‑diacetil', 420, 690],
          ['naloxona', 'Naloxona', 'N‑alilo, 14‑OH → antagonista', 980, 690],
        ];
        fam.forEach(([id, nom, mod, x, y], i) => {
          const f = eOut(prog(a, 33.8 + i * 0.45, 34.5 + i * 0.45));
          if (f <= 0) return;
          const m = MOL[id];
          dibujarMolecula(ctx, m, x, y, 36, { p: f, color: id === 'naloxona' ? P.kappa : P.ink, lw: 2.5 });
          txt(ctx, nom, x, y + 160, { family: F.display, size: 36, weight: 700, align: 'center', alpha: f });
          txt(ctx, mod, x, y + 190, { family: F.mono, size: 21, color: P.muted, align: 'center', alpha: f });
        });
        const fPr = prog(a, 35.4, 36.2);
        precision(ctx, 1300, 300, 520, 'Opiáceo ≠ opioide', 'Opiáceo: derivado del opio. Opioide: cualquier sustancia que actúa sobre los receptores opioides, incluidos sintéticos con otra estructura, como el fentanilo y la metadona.', fPr, { size: 27 });
      }
    }

    function receptores(t) {
      const a = t - N;
      const fZoom = eInOut(prog(a, 41.4, 42.6));
      txt(ctx, '¿Dónde interactúan?', 150, 110, { family: F.display, size: 60, weight: 800, stretch: 'condensed', alpha: prog(a, 38.7, 39.3) });
      // Neurona y lupa
      if (fZoom < 1) {
        ctx.save();
        ctx.globalAlpha *= 1 - fZoom;
        const zx = 1010, zy = 520;
        ctx.translate(zx, zy); ctx.scale(1 + fZoom * 3, 1 + fZoom * 3); ctx.translate(-zx, -zy);
        dibujarNeurona(ctx, 720, 520, 1.2, prog(a, 38.9, 41.0), P.accent, 11);
        const fl = prog(a, 40.6, 41.2);
        ctx.strokeStyle = P.ink; ctx.lineWidth = 4; ctx.globalAlpha *= fl;
        ctx.beginPath(); ctx.arc(zx, zy, 80, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(zx + 57, zy + 57); ctx.lineTo(zx + 110, zy + 110); ctx.stroke();
        txt(ctx, 'membrana neuronal', zx + 110, zy - 70, { family: F.mono, size: 24, color: P.muted });
        ctx.restore();
      }
      // Membrana con el receptor
      const cards = [
        { l: 'κ', n: 'kappa', c: P.kappa, cod: 'KOP · gen OPRK1', lig: 'Dinorfinas', t: 47.45 },
        { l: 'μ', n: 'mu', c: P.mu, cod: 'MOP · gen OPRM1', lig: 'β‑endorfina, endomorfinas', t: 49.1 },
        { l: 'δ', n: 'delta', c: P.delta, cod: 'DOP · gen OPRD1', lig: 'Encefalinas', t: 49.95, nota: 'poco audible en el audio' },
        { l: 'N', n: 'NOP', c: P.nop, cod: 'NOP · gen OPRL1', lig: 'Nociceptina / orfanina FQ', t: 50.7, prec: true },
      ];
      let color = P.accent;
      cards.forEach(c => { if (a >= c.t) color = c.c; });
      if (fZoom > 0) {
        ctx.save(); ctx.globalAlpha *= fZoom;
        const yA = 620, yB = 716, cx = 960;
        dibujarMembrana(ctx, 40, W - 40, yA, yB, [[cx - 170, cx + 170]], 1, t);
        dibujarGPCR(ctx, cx, yA, yB, color, prog(a, 42.4, 43.2), 1, t);
        txt(ctx, 'EXTERIOR', 60, 585, { family: F.mono, size: 22, color: P.dim, ls: 4 });
        txt(ctx, 'CITOPLASMA', 60, 780, { family: F.mono, size: 22, color: P.dim, ls: 4 });
        const fg = prog(a, 43.4, 44.2);
        proteinaG(ctx, 1040, 830, 1, fg, 0);
        txt(ctx, 'Proteína G inhibidora (Gi/o)', 1200, 842, { size: 28, color: P.muted, alpha: fg });
        const fl = prog(a, 43.0, 43.8);
        txt(ctx, 'Receptor acoplado a proteína G', 1190, 560, { family: F.display, size: 36, weight: 700, alpha: fl });
        txt(ctx, '7 hélices transmembrana', 1190, 596, { family: F.mono, size: 22, color: P.muted, alpha: fl });
        ctx.restore();
      }
      cards.forEach((c, i) => {
        const f = eBack(prog(a, c.t, c.t + 0.5));
        if (f <= 0) return;
        const x = 130 + i * 425, y = 160, w = 395, h = 300;
        ctx.save();
        ctx.globalAlpha *= clamp(f);
        ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.9 + 0.1 * f, 0.9 + 0.1 * f); ctx.translate(-(x + w / 2), -(y + h / 2));
        caja(ctx, x, y, w, h, 22, c.prec ? 'rgba(33,24,52,0.6)' : P.panel, hexA(c.c, c.prec ? 0.45 : 0.75), 2.5);
        if (c.prec) {
          ctx.save(); ctx.setLineDash([8, 8]); caja(ctx, x, y, w, h, 22, null, hexA(c.c, 0.8), 2.5); ctx.restore();
          txt(ctx, 'PRECISIÓN · 4.º RECEPTOR', x + 28, y + 44, { family: F.mono, size: 18, weight: 600, color: P.accent, ls: 2.5 });
          txt(ctx, 'NOP', x + 28, y + 128, { family: F.display, size: 84, weight: 800, color: c.c });
        } else {
          txt(ctx, c.l, x + 34, y + 128, { family: F.greek, italic: true, weight: 700, size: 120, color: c.c, glow: hexA(c.c, 0.5) });
          txt(ctx, c.n, x + 130, y + 118, { family: F.display, size: 50, weight: 700 });
        }
        txt(ctx, c.cod, x + 30, y + 186, { family: F.mono, size: 21, color: P.muted });
        txt(ctx, 'Ligando endógeno', x + 30, y + 228, { family: F.mono, size: 18, color: P.dim, ls: 1 });
        txt(ctx, c.lig, x + 30, y + 262, { size: 27 });
        if (c.nota) {
          txt(ctx, 'poco audible', x + w - 24, y + 42, { family: F.mono, size: 17, color: P.delta, align: 'right', alpha: 0.85 });
          txt(ctx, 'en el audio', x + w - 24, y + 64, { family: F.mono, size: 17, color: P.delta, align: 'right', alpha: 0.85 });
        }
        ctx.restore();
      });
    }

    function mecanismo(t) {
      const a = t - N;
      // Sinapsis
      const fS = prog(a, 51.8, 52.6);
      ctx.save(); ctx.globalAlpha *= fS;
      const pre = new Path2D();
      pre.moveTo(170, 40); pre.lineTo(170, 270);
      pre.bezierCurveTo(170, 340, 230, 372, 320, 372); pre.lineTo(820, 372);
      pre.bezierCurveTo(910, 372, 970, 340, 970, 270); pre.lineTo(970, 40);
      const gpre = ctx.createLinearGradient(0, 40, 0, 372);
      gpre.addColorStop(0, 'rgba(60,44,96,0.25)'); gpre.addColorStop(1, 'rgba(60,44,96,0.85)');
      ctx.fillStyle = gpre; ctx.fill(pre);
      ctx.strokeStyle = P.accent; ctx.lineWidth = 3; ctx.stroke(pre);
      const post = new Path2D();
      post.moveTo(170, 880); post.lineTo(170, 540);
      post.bezierCurveTo(170, 490, 230, 468, 320, 468); post.lineTo(820, 468);
      post.bezierCurveTo(910, 468, 970, 490, 970, 540); post.lineTo(970, 880);
      const gpost = ctx.createLinearGradient(0, 468, 0, 880);
      gpost.addColorStop(0, 'rgba(60,44,96,0.85)'); gpost.addColorStop(1, 'rgba(60,44,96,0.2)');
      ctx.fillStyle = gpost; ctx.fill(post);
      ctx.stroke(post);
      txt(ctx, 'TERMINAL PRESINÁPTICA', 200, 84, { family: F.mono, size: 20, color: P.muted, ls: 3 });
      txt(ctx, 'NEURONA POSTSINÁPTICA', 200, 860, { family: F.mono, size: 20, color: P.muted, ls: 3 });
      txt(ctx, 'hendidura', 990, 428, { family: F.mono, size: 20, color: P.dim });
      ctx.restore();

      const tLib = A(55.2), tK = A(54.6);
      // Vesículas
      const ves = [[620, 130], [740, 110], [870, 150], [660, 235], [790, 220], [905, 265], [720, 320], [850, 330]];
      ves.forEach(([x, y], i) => {
        ctx.save(); ctx.globalAlpha *= fS;
        ctx.strokeStyle = hexA(P.nt, 0.7); ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(255,217,168,0.08)';
        ctx.beginPath(); ctx.arc(x, y + Math.sin(t * 1.3 + i) * 4, 30, 0, TAU); ctx.fill(); ctx.stroke();
        for (let k = 0; k < 5; k++) punto(ctx, x + Math.cos(k * 1.3 + i) * 13, y + Math.sin(k * 1.3 + i) * 13 + Math.sin(t * 1.3 + i) * 4, 4.5, P.nt);
        ctx.restore();
      });
      // Liberación de neurotransmisor: frecuente antes, escasa después.
      const eventos = [];
      for (let te = A(51.9); te < tA + 1; te += 0.62) {
        const idx = Math.round((te - A(51.9)) / 0.62);
        if (te < tLib || idx % 4 === 0) eventos.push([te, idx]);
      }
      for (const [te, idx] of eventos) {
        const d = t - te;
        if (d < 0 || d > 1.2) continue;
        const x0 = [360, 500, 640, 780][idx % 4];
        const r = mulberry(idx + 3);
        for (let k = 0; k < 9; k++) {
          const ang = Math.PI / 2 + (r() - 0.5) * 1.6, v = 60 + r() * 60;
          punto(ctx, x0 + Math.cos(ang) * v * d, 376 + Math.sin(ang) * v * d * 0.9, 4.5, P.nt, fS * (1 - d / 1.2));
        }
      }
      // Receptores μ pre y postsinápticos
      const recs = [[330, 372, true], [760, 372, true], [420, 468, false], [700, 468, false]];
      recs.forEach(([x, y, preS]) => receptorMini(ctx, x, y, P.mu, fS, !preS));
      // Canal de Ca2+ (pre) y canal GIRK de K+ (post)
      const cierreCa = eInOut(prog(a, 55.0, 55.8));
      const aperturaK = eInOut(prog(a, 54.4, 55.0));
      const canal = (x, y, abierto, col) => {
        const g = lerp(4, 22, abierto);
        caja(ctx, x - g / 2 - 22, y - 30, 22, 60, 8, hexA(col, 0.9));
        caja(ctx, x + g / 2, y - 30, 22, 60, 8, hexA(col, 0.9));
      };
      ctx.save(); ctx.globalAlpha *= fS;
      canal(560, 372, 1 - cierreCa, P.ca);
      canal(560, 468, aperturaK, P.k);
      txt(ctx, 'Ca²⁺', 560, 330, { family: F.mono, size: 22, color: P.ca, align: 'center', weight: 600 });
      txt(ctx, 'K⁺ (GIRK)', 560, 530, { family: F.mono, size: 22, color: P.k, align: 'center', weight: 600 });
      if (cierreCa > 0.6) {
        ctx.strokeStyle = P.ca; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(590, 392); ctx.lineTo(612, 414); ctx.moveTo(612, 392); ctx.lineTo(590, 414); ctx.stroke();
      }
      ctx.restore();
      // Iones de Ca2+: entran mientras el canal está abierto; luego rebotan.
      for (let k = 0; k < 6; k++) {
        const q = ((t * 0.9 + k / 6) % 1);
        const x = 560 + Math.sin(k * 2.1) * 14;
        let y;
        if (cierreCa < 0.5) y = lerp(440, 300, q);
        else y = 440 - Math.sin(q * Math.PI) * 50;
        punto(ctx, x, y, 7, P.ca, fS * Math.sin(q * Math.PI));
      }
      // Iones de K+: salen tras la apertura del GIRK.
      for (let k = 0; k < 7; k++) {
        const q = ((t * 0.8 + k / 7) % 1);
        const x = 560 + Math.cos(k * 1.7) * 12;
        punto(ctx, x + q * Math.cos(k) * 30, lerp(560, 400, q), 7, P.k, aperturaK * Math.sin(q * Math.PI));
      }
      // Ligandos opioides que llegan y se unen
      recs.forEach(([x, y, preS], i) => {
        const f = eInOut(prog(a, 51.95 + i * 0.25, 53.0 + i * 0.25));
        if (f <= 0) return;
        const sx = -60, sy = 420 + (i - 1.5) * 30;
        const tx = x, ty = preS ? y + 44 : y - 44;
        const lx = lerp(sx, tx, f), ly = lerp(sy, ty, f) + Math.sin(f * Math.PI) * -60;
        ligando(ctx, lx, ly, 15, 1, t * 0.6 + i);
        if (f >= 1) brillo(ctx, x, y, 70, P.mu, 0.6 + 0.4 * Math.sin(t * 5 + i));
      });
      // Etiquetas de mecanismo
      const fA = prog(a, 53.3, 53.9);
      txt(ctx, 'Gi/o activa → ↓ AMPc', 200, 150, { family: F.mono, size: 22, color: P.accent, alpha: fA });
      txt(ctx, 'Gi/o activa → ↓ AMPc', 200, 610, { family: F.mono, size: 22, color: P.accent, alpha: fA });
      parrafo(ctx, 'Sale K⁺ → la neurona se hiperpolariza', 200, 680, 700, { size: 29, alpha: prog(a, 54.8, 55.4), lh: 36 });
      parrafo(ctx, 'Entra menos Ca²⁺ → se libera menos neurotransmisor', 200, 206, 330, { size: 27, alpha: prog(a, 55.6, 56.2), lh: 34 });

      // Gráfica de potencial de membrana
      const gx = 1250, gy = 150, gw = 570, gh = 320;
      const fG = prog(a, 52.3, 53.0);
      ctx.save(); ctx.globalAlpha *= fG;
      txt(ctx, 'POTENCIAL DE MEMBRANA · NEURONA POSTSINÁPTICA', 1100, 100, { family: F.mono, size: 19, weight: 600, color: P.muted, ls: 2 });
      const np = dibujarTraza(ctx, trazaMec, gx, gy, gw, gh, t, { tOpi: A(54.6) });
      txt(ctx, `Potenciales de acción: ${np}`, gx, gy + gh + 50, { family: F.mono, size: 22, color: P.ink });
      txt(ctx, 'modelo ilustrativo', gx + gw, gy + gh + 50, { family: F.mono, size: 18, color: P.dim, align: 'right' });
      ctx.restore();
      precision(ctx, 1100, 572, 720, null, 'No cambian la forma del potencial de acción: hacen menos probable que se dispare.', prog(a, 57.6, 58.3), { size: 26 });
      // Vía del dolor
      const fV = prog(a, 57.4, 58.0);
      if (fV > 0) {
        ctx.save(); ctx.globalAlpha *= fV;
        const nodos = [['Nociceptor', 1150], ['Médula', 1440], ['Cerebro', 1730]];
        const yv = 800;
        ctx.strokeStyle = P.line; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(1150, yv); ctx.lineTo(1730, yv); ctx.stroke();
        const atenua = 1 - 0.8 * eInOut(prog(a, 58.2, 60.5));
        for (let k = 0; k < 3; k++) {
          const q = ((t * 0.7 + k / 3) % 1);
          const x = lerp(1150, 1730, q);
          const amp = q < 0.5 ? 1 : atenua;
          brillo(ctx, x, yv, 36 * amp + 8, P.mu, amp);
          punto(ctx, x, yv, 7 * amp + 2, P.mu, amp);
        }
        nodos.forEach(([n, x], i) => {
          punto(ctx, x, yv, 14, i === 2 ? hexA(P.mu, 0.35 + 0.65 * atenua) : P.ink);
          txt(ctx, n, x, yv + 48, { family: F.mono, size: 21, color: P.muted, align: 'center' });
        });
        txt(ctx, 'SEÑAL DE DOLOR', 1100, 750, { family: F.mono, size: 19, weight: 600, color: P.muted, ls: 2 });
        txt(ctx, 'Menos señal de dolor → analgesia', 1450, 900, { family: F.display, size: 36, weight: 700, color: P.ink, align: 'center', alpha: prog(a, 60.2, 60.9) });
        ctx.restore();
      }
    }

    // ---------------------------------------------- aclaraciones (TTS)
    function visualTarjeta(c, t, x0, y0) {
      const loc = locDe(c.t_voz);
      const tw = (p, n) => tPalabra(loc, p, n);
      if (c.id === 'ubicacion') {
        const pos = dibujarSNC(ctx, x0 + 60, y0 - 10, 560, { p: 1, periferia: prog(t, tw('medula') - 0.4, tw('medula')), lw: 2.6 });
        REGIONES.forEach((r, i) => marcaRegion(ctx, pos[r.id][0], pos[r.id][1], prog(t, tw('cerebro') - 0.2, tw('cerebro') + 0.3), P.accent, t + i));
        const ev = { medula: tw('medula'), nervio: tw('nervios'), intestino: tw('intestino') };
        PERIFERIA.forEach((r, i) => {
          const f = prog(t, ev[r.id] - 0.1, ev[r.id] + 0.4);
          marcaRegion(ctx, pos[r.id][0], pos[r.id][1], f, P.kappa, t + i, true);
          const [px, py] = pos[r.id];
          const lx = r.id === 'intestino' ? px - 30 : px + 34;
          txt(ctx, r.nombre, lx, py + (r.id === 'medula' ? -26 : 58), { family: F.mono, size: 20, color: P.kappa, alpha: f, align: r.id === 'intestino' ? 'center' : 'left' });
        });
      } else if (c.id === 'definicion') {
        const items = [['morfina', 'Opiáceo · natural', x0 + 420, y0 + 180, tw('morfina')],
          ['fentanilo', 'Opioide sintético', x0 + 200, y0 + 560, tw('fentanilo')],
          ['metadona', 'Opioide sintético', x0 + 640, y0 + 560, tw('metadona')]];
        items.forEach(([id, et, x, y, te]) => {
          const f = eOut(prog(t, te - 0.3, te + 0.5));
          if (f <= 0) return;
          const m = MOL[id];
          dibujarMolecula(ctx, m, x, y, 34, { p: f, color: P.ink, lw: 2.4, brillos: [{ atomos: m.grupos.amina, color: P.mu, a: prog(t, tw('naloxona') - 0.2, tw('naloxona') + 0.4) + prog(t, c.t_fin_voz - 1.5, c.t_fin_voz - 0.8), r: 1.5 }] });
          txt(ctx, MOL[id].nombre.split(' ')[0], x, y + (id === 'morfina' ? 150 : 160), { family: F.display, size: 32, weight: 700, align: 'center', alpha: f });
          txt(ctx, et, x, y + (id === 'morfina' ? 180 : 190), { family: F.mono, size: 20, color: id === 'morfina' ? P.delta : P.kappa, align: 'center', alpha: f });
        });
        const fN = prog(t, c.t_fin_voz - 1.5, c.t_fin_voz - 0.8);
        txt(ctx, 'En común: un nitrógeno básico', x0 + 420, y0 + 800, { family: F.mono, size: 22, color: P.mu, align: 'center', alpha: fN });
      } else if (c.id === 'receptores') {
        const rs = [['μ', 'MOP', P.mu, 'β‑endorfina', 'Analgesia, euforia, depresión respiratoria, estreñimiento', tw('mu')],
          ['δ', 'DOP', P.delta, 'Encefalinas', 'Analgesia, regulación del estado de ánimo', tw('delta')],
          ['κ', 'KOP', P.kappa, 'Dinorfinas', 'Analgesia espinal, disforia, diuresis', tw('kappa')],
          ['N', 'NOP', P.nop, 'Nociceptina', 'Modula dolor y estrés; no la bloquea la naloxona', tw('nociceptina')]];
        const fG = prog(t, tw('inhibidoras') - 0.4, tw('inhibidoras') + 0.3);
        rs.forEach(([l, cod, col, lig, ef, te], i) => {
          const f = eBack(prog(t, te - 0.25, te + 0.3));
          if (f <= 0) return;
          const x = x0 + 20, y = y0 + i * 188, w = 800, h = 168;
          ctx.save(); ctx.globalAlpha *= clamp(f);
          caja(ctx, x, y, w, h, 20, P.panel, hexA(col, 0.6), 2);
          if (l === 'N') txt(ctx, 'NOP', x + 30, y + 98, { family: F.display, size: 58, weight: 800, color: col });
          else txt(ctx, l, x + 34, y + 110, { family: F.greek, italic: true, weight: 700, size: 104, color: col });
          txt(ctx, `${cod} · ${lig}`, x + 190, y + 56, { family: F.mono, size: 22, color: P.muted });
          parrafo(ctx, ef, x + 190, y + 100, 580, { size: 27, lh: 33 });
          if (fG > 0) {
            caja(ctx, x + w - 118, y + 24, 94, 38, 19, hexA(P.accent, 0.18 * fG), hexA(P.accent, 0.8 * fG), 2);
            txt(ctx, 'Gi/o', x + w - 71, y + 51, { family: F.mono, size: 21, weight: 600, color: P.accent, align: 'center', alpha: fG });
          }
          ctx.restore();
        });
      } else if (c.id === 'potencial') {
        const tK = tw('potasio'), tCa = tw('calcio');
        // Forma del PA: idéntica
        const fF = prog(t, c.t_voz, c.t_voz + 0.6);
        ctx.save(); ctx.globalAlpha *= fF;
        txt(ctx, 'FORMA DEL POTENCIAL DE ACCIÓN', x0 + 20, y0 + 30, { family: F.mono, size: 19, weight: 600, color: P.muted, ls: 2 });
        const ap = [-70, -69, -66, -58, -40, 10, 32, 20, -10, -45, -70, -80, -78, -74, -71, -70, -70];
        const dib = (col, dx, dash) => {
          ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 4; if (dash) ctx.setLineDash([10, 9]);
          ctx.beginPath();
          ap.forEach((v, i) => { const x = x0 + 40 + i * 18 + dx, y = y0 + 220 - (v + 90) * 1.35; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.stroke(); ctx.restore();
        };
        dib(P.k, 0, false); dib(P.drug, 0, true);
        txt(ctx, 'sin opioide', x0 + 360, y0 + 110, { family: F.mono, size: 20, color: P.k });
        txt(ctx, 'con opioide (igual)', x0 + 360, y0 + 142, { family: F.mono, size: 20, color: P.drug });
        ctx.restore();
        // Tasa de disparo: antes y después
        const fR = prog(t, tK - 0.3, tK + 0.4);
        const sin = modeloVm(0, 4, { tOpi: 99, tPre: 99, periodo: 0.55, primero: 0.2 });
        const con = modeloVm(0, 4, { tOpi: -10, tPre: -10, periodo: 0.55, primero: 0.2 });
        ctx.save(); ctx.globalAlpha *= fR;
        txt(ctx, 'SIN OPIOIDE', x0 + 110, y0 + 300, { family: F.mono, size: 19, weight: 600, color: P.muted, ls: 2 });
        dibujarTraza(ctx, sin, x0 + 110, y0 + 320, 680, 150, 4, { fs: 16, lw: 2.5 });
        ctx.restore();
        const fC = prog(t, tCa - 0.3, tCa + 0.4);
        ctx.save(); ctx.globalAlpha *= fC;
        txt(ctx, 'CON OPIOIDE: HIPERPOLARIZADA, EPSP MENORES', x0 + 110, y0 + 520, { family: F.mono, size: 19, weight: 600, color: P.muted, ls: 2 });
        dibujarTraza(ctx, con, x0 + 110, y0 + 540, 680, 150, 4, { fs: 16, lw: 2.5, color: P.drug });
        ctx.restore();
      } else if (c.id === 'depresion') {
        const tD = tw('desinhiben'), tDo = tw('dopamina'), tS = tw('sobredosis'), tN = tw('naloxona');
        const fOp = prog(t, tD - 0.2, tD + 0.6);
        const gaba = [x0 + 150, y0 + 170], da = [x0 + 450, y0 + 170], nac = [x0 + 740, y0 + 170];
        txt(ctx, 'CIRCUITO DE RECOMPENSA (ATV → NÚCLEO ACCUMBENS)', x0 + 20, y0 + 20, { family: F.mono, size: 19, weight: 600, color: P.muted, ls: 2 });
        // Conexiones
        ctx.save();
        ctx.strokeStyle = hexA(P.ink, 0.6); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(gaba[0] + 60, gaba[1]); ctx.lineTo(da[0] - 70, da[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(da[0] - 70, da[1] - 22); ctx.lineTo(da[0] - 70, da[1] + 22); ctx.stroke();
        flecha(ctx, da[0] + 62, da[1], nac[0] - 70, nac[1], hexA(P.ink, 0.6), 4, 18);
        ctx.restore();
        txt(ctx, 'inhibe (−)', (gaba[0] + da[0]) / 2, gaba[1] - 26, { family: F.mono, size: 18, color: P.dim, align: 'center' });
        const actGaba = 1 - 0.8 * fOp, actDa = 0.35 + 0.65 * prog(t, tDo - 0.6, tDo + 0.2);
        const nodo = (p, r, col, act, et1, et2) => {
          brillo(ctx, p[0], p[1], r * 2.2, col, act);
          punto(ctx, p[0], p[1], r, hexA(col, 0.25 + 0.75 * act));
          ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.stroke(); ctx.restore();
          txt(ctx, et1, p[0], p[1] + r + 40, { size: 26, weight: 700, align: 'center' });
          txt(ctx, et2, p[0], p[1] + r + 72, { family: F.mono, size: 18, color: P.muted, align: 'center' });
        };
        nodo(gaba, 54, P.k, actGaba, 'Interneurona', 'GABA');
        nodo(da, 58, P.delta, actDa, 'Neurona de', 'dopamina (ATV)');
        nodo(nac, 54, P.mu, 0.3 + 0.7 * prog(t, tDo - 0.3, tDo + 0.5), 'Núcleo', 'accumbens');
        if (fOp > 0) { ligando(ctx, gaba[0] - 40, gaba[1] - 70, 14, fOp, t); txt(ctx, 'μ', gaba[0] + 50, gaba[1] - 58, { family: F.greek, italic: true, weight: 700, size: 36, color: P.mu, alpha: fOp }); }
        // Sobredosis y antídoto
        const fS = prog(t, tS - 0.3, tS + 0.4), fNa = prog(t, tN - 0.3, tN + 0.4);
        const chips = ['Depresión respiratoria', 'Miosis (pupilas puntiformes)', 'Coma'];
        txt(ctx, 'SOBREDOSIS: TRÍADA CLÁSICA', x0 + 20, y0 + 430, { family: F.mono, size: 19, weight: 600, color: P.muted, ls: 2, alpha: fS });
        chips.forEach((c2, i) => {
          const f = prog(t, tS - 0.2 + i * 0.25, tS + 0.3 + i * 0.25);
          const y = y0 + 460 + i * 76;
          ctx.save(); ctx.globalAlpha *= f;
          caja(ctx, x0 + 20, y, 520, 60, 30, hexA(P.mu, i === 0 ? 0.22 : 0.1), hexA(P.mu, 0.7), 2);
          txt(ctx, c2, x0 + 48, y + 40, { size: 27, weight: i === 0 ? 700 : 400 });
          ctx.restore();
        });
        ctx.save(); ctx.globalAlpha *= fNa;
        caja(ctx, x0 + 570, y0 + 460, 260, 212, 22, hexA(P.kappa, 0.14), hexA(P.kappa, 0.85), 2.5);
        txt(ctx, 'ANTÍDOTO', x0 + 596, y0 + 502, { family: F.mono, size: 19, weight: 600, color: P.kappa, ls: 2 });
        txt(ctx, 'Naloxona', x0 + 596, y0 + 556, { family: F.display, size: 44, weight: 800 });
        parrafo(ctx, 'antagonista competitivo de acción corta', x0 + 596, y0 + 596, 220, { size: 22, color: P.muted, lh: 27 });
        ctx.restore();
      }
    }

    function aclaraciones(t) {
      const t1 = TARJ[0].t_ini;
      const fTit = prog(t, tA, tA + 0.6) * (1 - prog(t, t1 - 0.5, t1));
      if (fTit > 0) {
        ctx.save(); ctx.globalAlpha *= fTit;
        txt(ctx, 'SEGUNDA PARTE', W / 2, 360, { family: F.mono, size: 26, weight: 600, color: P.accent, ls: 8, align: 'center' });
        txt(ctx, 'Aclaraciones rigurosas', W / 2, 500, { family: F.display, size: 150, weight: 800, stretch: 'condensed', align: 'center' });
        txt(ctx, '5 precisiones sobre lo que acabamos de escuchar', W / 2, 580, { size: 42, color: P.muted, align: 'center' });
        txt(ctx, 'Narración de apoyo con voz sintética', W / 2, 800, { family: F.mono, size: 21, color: P.dim, align: 'center' });
        ctx.restore();
      }
      TARJ.forEach((c, k) => {
        const f = prog(t, c.t_ini, c.t_ini + 0.6) * (1 - prog(t, c.t_fin - 0.45, c.t_fin));
        if (f <= 0) return;
        ctx.save();
        ctx.globalAlpha *= f;
        const dx = (1 - eOut(prog(t, c.t_ini, c.t_ini + 0.7))) * 60;
        ctx.translate(dx, 0);
        txt(ctx, `ACLARACIÓN ${k + 1}/${TARJ.length}`, 120, 110, { family: F.mono, size: 22, weight: 600, color: P.accent, ls: 4 });
        txt(ctx, c.tema, 460, 110, { family: F.mono, size: 22, color: P.muted });
        for (let i = 0; i < TARJ.length; i++) punto(ctx, 1690 + i * 26, 102, 7, i === k ? P.accent : P.dim);
        // Columna izquierda
        const m = Math.floor(c.t_audio / 60), s = Math.floor(c.t_audio % 60);
        txt(ctx, 'DIJIMOS', 120, 200, { family: F.mono, size: 20, weight: 600, color: P.muted, ls: 3 });
        caja(ctx, 250, 176, 150, 34, 17, 'rgba(255,255,255,0.06)', P.line, 1.5);
        txt(ctx, `audio ${m}:${String(s).padStart(2, '0')}`, 325, 200, { family: F.mono, size: 18, color: P.muted, align: 'center' });
        const hq = parrafo(ctx, c.dijimos, 120, 258, 740, { size: 38, italic: true, color: hexA(P.ink, 0.72), lh: 48 });
        const yp = 258 + hq + 20;
        ctx.fillStyle = P.line; ctx.fillRect(120, yp, 740, 2);
        txt(ctx, 'CON MÁS PRECISIÓN', 120, yp + 56, { family: F.mono, size: 20, weight: 600, color: P.accent, ls: 3 });
        const ht = parrafo(ctx, c.titular, 120, yp + 124, 760, { family: F.display, size: 58, weight: 750, lh: 64, stretch: 'semi-condensed' });
        const durV = c.t_fin_voz - c.t_voz;
        c.puntos.forEach((pt, i) => {
          const fp = prog(t, c.t_voz + durV * [0.02, 0.36, 0.66][i], c.t_voz + durV * [0.02, 0.36, 0.66][i] + 0.5);
          const y = yp + 124 + ht + 30 + i * 84;
          punto(ctx, 132, y - 10, 7, P.accent, fp);
          parrafo(ctx, pt, 156, y, 700, { size: 31, alpha: fp, lh: 38 });
        });
        visualTarjeta(c, t, 960, 190);
        ctx.restore();
      });
    }

    function resumen(t) {
      const f0 = prog(t, tR, tR + 0.6);
      txt(ctx, 'En resumen', 150, 200, { family: F.display, size: 96, weight: 800, stretch: 'condensed', alpha: f0 });
      const ideas = [
        [P.accent, 'Un opioide es toda sustancia que actúa sobre los receptores opioides:\u00A0μ,\u00A0δ,\u00A0κ\u00A0(y\u00A0NOP).'],
        [P.kappa, 'Son receptores acoplados a proteínas Gi/o: ↓ AMPc, ↑ salida de K⁺ (GIRK), ↓ entrada de Ca²⁺.'],
        [P.mu, 'Uso terapéutico principal: analgesia. Riesgo principal: depresión respiratoria; antídoto, naloxona.'],
      ];
      ideas.forEach(([c, s], i) => {
        const f = eOut(prog(t, tR + 0.6 + i * 0.7, tR + 1.3 + i * 0.7));
        const y = 330 + i * 150;
        ctx.save(); ctx.globalAlpha *= f; ctx.translate((1 - f) * 40, 0);
        ctx.fillStyle = c; ctx.fillRect(150, y - 8, 8, 96);
        parrafo(ctx, s, 190, y + 30, 1300, { size: 40, lh: 52 });
        ctx.restore();
      });
      txt(ctx, 'Fuentes: Goodman & Gilman, 14.ª ed. · Katzung, 16.ª ed. · IUPHAR/BPS Guide to Pharmacology', 150, 850, { family: F.mono, size: 21, color: P.muted, alpha: prog(t, tR + 2.6, tR + 3.2) });
      const m = MOL.morfina;
      ctx.save(); ctx.globalAlpha *= 0.14 * f0;
      dibujarMolecula(ctx, m, 1640, 560, 50, { color: P.accent, lw: 3 });
      ctx.restore();
    }

    const ESCENAS = [
      { ini: -1, fin: A(1.5), fn: intro, cap: 'Presentación' },
      { ini: A(1.3), fin: A(9.5), fn: medicamentos, cap: 'Medicamentos y opioides' },
      { ini: A(9.3), fin: A(20.6), fn: sistema, cap: 'Sistema nervioso' },
      { ini: A(20.4), fin: A(38.5), fn: molecula, cap: '¿Qué es un opioide?' },
      { ini: A(38.3), fin: A(51.85), fn: receptores, cap: 'Receptores' },
      { ini: A(51.65), fin: tA + 0.4, fn: mecanismo, cap: 'Mecanismo de acción', sinEtiqueta: true },
      { ini: tA, fin: tR + 0.3, fn: aclaraciones, cap: 'Aclaraciones rigurosas', sinEtiqueta: true },
      { ini: tR, fin: TT + 5, fn: resumen, cap: 'Resumen' },
    ];

    function subtitulos(t) {
      const b = bloques.find(x => t >= x.t0 - 0.12 && t < x.hasta);
      if (!b) return;
      const fs = 44;
      const o = { size: fs, family: F.body, weight: 700 };
      const esp = medir(ctx, ' ', o);
      const anchos = b.pal.map(p => medir(ctx, p.w, o));
      const total = anchos.reduce((s, w) => s + w, 0) + esp * (anchos.length - 1);
      const a = Math.min(prog(t, b.t0 - 0.12, b.t0 + 0.05), 1 - prog(t, b.hasta - 0.15, b.hasta));
      const x0 = W / 2 - total / 2, y = H - 74;
      ctx.save();
      ctx.globalAlpha *= a;
      caja(ctx, x0 - 30, y - fs - 12, total + 60, fs + 36, 16, 'rgba(10,7,18,0.72)');
      let x = x0;
      b.pal.forEach((p, i) => {
        const dicha = t >= p.t1, actual = t >= p.t0 && t < p.t1;
        const col = actual ? P.accent : dicha ? P.ink : hexA(P.ink, 0.5);
        txt(ctx, p.w, x, y, { ...o, color: col });
        if (actual) { ctx.fillStyle = P.accent; ctx.fillRect(x, y + 9, anchos[i], 3); }
        x += anchos[i] + esp;
      });
      ctx.restore();
    }

    function capitulo(t) {
      const e = ESCENAS.filter(s => t >= s.ini + 0.2).pop();
      if (!e || t < 5 || e.sinEtiqueta) return;
      const a = prog(t, 5, 5.6) * (1 - prog(t, TT - 1.2, TT - 0.4));
      txt(ctx, 'OPIOIDES', W - 120, 64, { family: F.mono, size: 18, weight: 600, color: P.dim, ls: 4, align: 'right', alpha: a });
      txt(ctx, e.cap.toUpperCase(), W - 120, 92, { family: F.mono, size: 18, color: P.muted, ls: 2, align: 'right', alpha: a });
    }

    function dibujar(t) {
      const k = canvas.width / W;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      fondo(t);
      for (const e of ESCENAS) {
        const al = Math.min(prog(t, e.ini, e.ini + 0.5), 1 - prog(t, e.fin - 0.5, e.fin));
        if (al <= 0) continue;
        ctx.save(); ctx.globalAlpha = al; e.fn(t); ctx.restore();
      }
      capitulo(t);
      subtitulos(t);
      const negro = Math.max(1 - prog(t, 0, 0.6), prog(t, TT - 0.8, TT));
      if (negro > 0) { ctx.fillStyle = `rgba(6,4,10,${negro})`; ctx.fillRect(0, 0, W, H); }
    }

    function miniatura() {
      const k = canvas.width / W;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalAlpha = 1;
      fondo(3);
      const m = MOL.morfina;
      brillo(ctx, 1400, 470, 520, P.accent, 0.55);
      dibujarMolecula(ctx, m, 1400, 470, 96, { color: P.drug, lw: 6, brillos: [{ atomos: m.grupos.amina, color: P.mu, a: 1, r: 1.4 }, { atomos: m.grupos.fenol, color: P.kappa, a: 0.9 }] });
      txt(ctx, 'OPIOIDES', 90, 440, { family: F.display, size: 250, weight: 800, stretch: 'condensed', ls: -2 });
      txt(ctx, '¿cómo actúan en tu', 100, 560, { family: F.display, size: 96, weight: 700, color: P.accent });
      txt(ctx, 'sistema nervioso?', 100, 660, { family: F.display, size: 96, weight: 700, color: P.accent });
      [['μ', P.mu], ['δ', P.delta], ['κ', P.kappa]].forEach(([l, c], i) => {
        caja(ctx, 100 + i * 150, 740, 124, 124, 62, hexA(c, 0.16), c, 4);
        txt(ctx, l, 162 + i * 150, 828, { family: F.greek, italic: true, weight: 700, size: 78, color: c, align: 'center' });
      });
      caja(ctx, 1180, 900, 640, 90, 45, hexA(P.accent, 0.16), P.accent, 3);
      txt(ctx, 'con aclaraciones rigurosas', 1500, 958, { family: F.mono, size: 34, weight: 600, color: P.ink, align: 'center' });
    }

    return {
      dibujar, miniatura, W, H,
      duracion: TT, capitulos: D.capitulos,
      escenas: ESCENAS.map(e => ({ ini: Math.max(0, e.ini), fin: e.fin, cap: e.cap })),
    };
  }

  global.Escenario = {
    crear, W, H, PALETA: P, FUENTES: F,
    // Utilidades reutilizadas por la página interactiva.
    prepararMolecula, dibujarMolecula, modeloVm, dibujarTraza,
    util: {
      txt, parrafo, brillo, punto, caja, flecha, hexA, clamp, lerp, prog, eOut, eInOut, eBack, mulberry,
      lineas, medir, precision,
      dibujarSNC, marcaRegion, REGIONES, PERIFERIA, dibujarMembrana, dibujarGPCR,
      receptorMini, ligando, proteinaG,
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
