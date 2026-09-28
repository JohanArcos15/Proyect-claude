/*
 * Escenario 3D «Opioides» (1920×1080).
 *
 * Compone recursos renderizados con Blender Cycles (assets/3d) y moléculas
 * con geometría 3D real (conformaciones MMFF94s) dibujadas átomo a átomo con
 * esferas fotorrealistas. Como stage.js, es determinista: el fotograma solo
 * depende del tiempo t, así que la web y el vídeo muestran lo mismo.
 *
 * Requiere stage.js (utilidades de rótulos) y window.DATOS (datos.js).
 */
(function (global) {
  'use strict';

  const E = global.Escenario;
  const U = E.util;
  const P = E.PALETA;
  const F = E.FUENTES;
  const W = 1920, H = 1080;
  const { txt, parrafo, brillo, punto, caja, flecha, hexA, clamp, lerp, prog, eOut, eInOut, eBack, mulberry, precision } = U;
  const TAU = Math.PI * 2;
  const FONDO = '#0B0814';

  // ------------------------------------------------------------ carga
  function imagen(src) {
    return new Promise(res => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
  }

  async function cargar(base, opciones = {}) {
    const paso = opciones.pasoSecuencias || 1;
    const avisar = opciones.alProgreso || (() => {});
    const json = async p => { try { const r = await fetch(base + p); return r.ok ? r.json() : null; } catch (e) { return null; } };
    const R = { img: {}, seq: {}, meta: {} };
    const [mol3d, mC, mT, mA, mS, mM, mN, mP] = await Promise.all([
      json('moleculas3d.json'), json('cerebro_rayosx/meta.json'), json('cerebro_tejido/meta.json'),
      json('amapola/meta.json'), json('sinapsis/meta.json'), json('membrana/meta.json'),
      json('neurona/meta.json'), json('pastillas/meta.json'),
    ]);
    R.mol3d = mol3d || [];
    Object.assign(R.meta, { cerebro_rayosx: mC, cerebro_tejido: mT, amapola: mA, sinapsis: mS, membrana: mM, neurona: mN, pastillas: mP });
    const tareas = [];
    const sueltas = {
      'atomo_C': 'atomos/C.webp', 'atomo_H': 'atomos/H.webp', 'atomo_O': 'atomos/O.webp', 'atomo_N': 'atomos/N.webp',
      'ion_K': 'atomos/K.webp', 'ion_Ca': 'atomos/Ca.webp', 'ion_NT': 'atomos/NT.webp',
      'pastillas_fondo': 'pastillas/fondo.webp', 'pastillas_heroe': 'pastillas/heroe.webp',
      'neurona_red': 'neurona/red.webp', 'neurona_sola': 'neurona/sola.webp', 'sinapsis': 'sinapsis/sinapsis.webp',
      'membrana_mu': 'membrana/mu.webp', 'membrana_delta': 'membrana/delta.webp',
      'membrana_kappa': 'membrana/kappa.webp', 'membrana_nop': 'membrana/nop.webp',
    };
    for (const [k, ruta] of Object.entries(sueltas)) tareas.push(() => imagen(base + ruta).then(im => { R.img[k] = im; }));
    for (const [clave, meta, pasoSeq] of [['amapola', mA, 1], ['cerebro_tejido', mT, 1], ['cerebro_rayosx', mC, paso]]) {
      const n = meta ? meta.n : 0;
      R.seq[clave] = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i % pasoSeq !== 0 && i !== n - 1) continue;
        tareas.push(() => imagen(`${base}${clave}/${String(i).padStart(3, '0')}.webp`).then(im => { R.seq[clave][i] = im; }));
      }
    }
    let hechas = 0;
    const total = tareas.length;
    const cola = tareas.slice();
    async function obrero() {
      while (cola.length) { await cola.shift()(); hechas++; avisar(hechas / total); }
    }
    R.listo = Promise.all(Array.from({ length: 6 }, obrero)).then(() => R);
    // Con esperar:false se devuelve en cuanto hay metadatos y las imágenes siguen llegando.
    if (opciones.esperar !== false) await R.listo;
    return R;
  }

  // ------------------------------------------------ imágenes y planos
  function fotogramas(seq, u) {
    const n = seq ? seq.length : 0;
    if (!n) return [null, null, 0];
    u = clamp(u, 0, n - 1);
    let i0 = Math.floor(u), i1 = Math.min(n - 1, i0 + 1);
    while (i0 > 0 && !seq[i0]) i0--;
    while (i1 < n - 1 && !seq[i1]) i1++;
    if (!seq[i0]) return [seq[i1], null, 0];
    if (!seq[i1] || i1 === i0) return [seq[i0], null, 0];
    return [seq[i0], seq[i1], (u - i0) / (i1 - i0)];
  }

  function secuencia(ctx, seq, u, x, y, w, h, alfa = 1) {
    const [a, b, f] = fotogramas(seq, u);
    if (!a) return;
    ctx.save();
    ctx.globalAlpha *= alfa;
    ctx.drawImage(a, x, y, w, h);
    if (b && f > 0.02) { ctx.globalAlpha = alfa * f; ctx.drawImage(b, x, y, w, h); }
    ctx.restore();
  }

  // Plano a pantalla completa con encuadre (zoom y centro en coordenadas de la imagen).
  function plano(ctx, img, o = {}) {
    if (!img) return null;
    const zoom = o.zoom || 1;
    const base = Math.max(W / img.width, H / img.height);
    const dw = img.width * base * zoom, dh = img.height * base * zoom;
    const mx = W / dw / 2, my = H / dh / 2;
    const cx = clamp(o.cx == null ? 0.5 : o.cx, mx, 1 - mx), cy = clamp(o.cy == null ? 0.5 : o.cy, my, 1 - my);
    const x0 = W / 2 - cx * dw, y0 = H / 2 - cy * dh;
    ctx.save();
    ctx.globalAlpha *= o.alfa == null ? 1 : o.alfa;
    if (o.desenfoque) ctx.filter = `blur(${o.desenfoque}px)`;
    ctx.drawImage(img, x0, y0, dw, dh);
    ctx.restore();
    return (nx, ny) => [x0 + nx * dw, y0 + ny * dh];
  }

  function tintar(img, color, fuerza = 0.6) {
    if (!img) return null;
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = fuerza;
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // ------------------------------------------ moléculas (impostores 3D)
  const RADIO = { C: 0.36, H: 0.23, O: 0.37, N: 0.37 };
  const COL_ENLACE = { C: [58, 60, 66], H: [205, 207, 214], O: [176, 34, 26], N: [34, 70, 200] };

  function prepararMol3D(m, anillos2D) {
    return { ...m, anillos: anillos2D || [] };
  }

  function rgb(c, k) {
    const f = v => Math.round(clamp(v * k, 0, 255));
    return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`;
  }

  function dibujarMol3D(ctx, R, M, o) {
    if (!M) return [];
    const esc = o.esc, D = o.distancia || 45;
    const cY = Math.cos(o.rotY || 0), sY = Math.sin(o.rotY || 0), cX = Math.cos(o.rotX || 0), sX = Math.sin(o.rotX || 0);
    const p3 = M.atoms.map(a => {
      const x = a.x * cY + a.z * sY, z1 = -a.x * sY + a.z * cY;
      const y = a.y * cX - z1 * sX, z = a.y * sX + z1 * cX;
      return [x, y, z];
    });
    const pr = ([x, y, z]) => { const f = D / (D - z); return [o.cx + x * esc * f, o.cy - y * esc * f, f]; };
    const pts = p3.map(pr);
    let zmin = Infinity, zmax = -Infinity;
    p3.forEach(p => { zmin = Math.min(zmin, p[2]); zmax = Math.max(zmax, p[2]); });
    const items = [];
    const esH = i => M.atoms[i].el === 'H';
    M.atoms.forEach((a, i) => { if (!(o.sinH && esH(i))) items.push({ t: 0, i, z: p3[i][2] }); });
    M.bonds.forEach((b, k) => {
      if (o.sinH && (esH(b.a) || esH(b.b))) return;
      for (const [i, j] of [[b.a, b.b], [b.b, b.a]]) {
        const pi = p3[i], pj = p3[j];
        const d = [pj[0] - pi[0], pj[1] - pi[1], pj[2] - pi[2]];
        const L = Math.hypot(...d);
        const u = d.map(v => v / L);
        const ri = RADIO[M.atoms[i].el] || 0.35;
        const ini = pi.map((v, q) => v + u[q] * ri * 0.55);
        const fin = pi.map((v, q) => v + d[q] * 0.5);
        items.push({ t: 1, i, o: b.o, ini, fin, z: (ini[2] + fin[2]) / 2 - 0.05 });
      }
    });
    items.sort((a, b) => a.z - b.z);
    const niebla = o.niebla == null ? 0.55 : o.niebla;
    const brillos = o.brillos || [];
    ctx.save();
    ctx.globalAlpha *= o.alfa == null ? 1 : o.alfa;
    for (const it of items) {
      const prof = zmax > zmin ? (zmax - it.z) / (zmax - zmin) : 0;
      const osc = 1 - niebla * 0.75 * prof;
      if (it.t === 1) {
        const [x1, y1, f1] = pr(it.ini), [x2, y2] = pr(it.fin);
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
        let nx = -dy / L, ny = dx / L;
        if (nx * -0.7 + ny * -0.7 < 0) { nx = -nx; ny = -ny; }
        const col = COL_ENLACE[M.atoms[it.i].el] || COL_ENLACE.C;
        const barra = (ox, oy, ancho) => {
          const g = ctx.createLinearGradient(x1 + ox + nx * ancho / 2, y1 + oy + ny * ancho / 2, x1 + ox - nx * ancho / 2, y1 + oy - ny * ancho / 2);
          g.addColorStop(0, rgb(col, 0.9 * osc)); g.addColorStop(0.28, rgb(col, 1.55 * osc)); g.addColorStop(0.55, rgb(col, 0.95 * osc));
          g.addColorStop(1, rgb(col, 0.35 * osc));
          ctx.strokeStyle = g; ctx.lineWidth = ancho; ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.moveTo(x1 + ox, y1 + oy); ctx.lineTo(x2 + ox, y2 + oy); ctx.stroke();
        };
        const w = 0.22 * esc * f1;
        if (it.o === 2) { const off = 0.13 * esc * f1; barra(nx * off, ny * off, w * 0.62); barra(-nx * off, -ny * off, w * 0.62); }
        else barra(0, 0, w);
      } else {
        const a = M.atoms[it.i], [x, y, f] = pts[it.i];
        const r = (RADIO[a.el] || 0.35) * esc * f;
        for (const b of brillos) {
          if (b.a > 0 && b.atomos.includes(it.i)) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            brillo(ctx, x, y, r * (b.r || 3.4), b.color, b.a);
            ctx.restore();
          }
        }
        const g = ctx.createRadialGradient(x + r * 0.2, y + r * 0.28, r * 0.5, x + r * 0.2, y + r * 0.28, r * 1.35);
        g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + r * 0.2, y + r * 0.28, r * 1.35, 0, TAU); ctx.fill();
        const spr = R.img['atomo_' + a.el] || R.img.atomo_C;
        const lado = 2 * r * 384 / 369;
        if (spr) ctx.drawImage(spr, x - lado / 2, y - lado / 2, lado, lado);
        if (prof > 0.02 && niebla > 0) {
          ctx.fillStyle = `rgba(11,8,20,${(niebla * 0.62 * prof).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(x, y, r * 0.99, 0, TAU); ctx.fill();
        }
      }
    }
    // Halo final por encima para que los grupos resaltados se lean aunque estén detrás
    for (const b of brillos) {
      if (!(b.a > 0)) continue;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const i of b.atomos) {
        const r = (RADIO[M.atoms[i].el] || 0.35) * esc * pts[i][2];
        brillo(ctx, pts[i][0], pts[i][1], r * 2.6, b.color, b.a * 0.55);
      }
      ctx.restore();
    }
    if (o.anillos) {
      M.anillos.forEach((anillo, k) => {
        const a = typeof o.anillos === 'function' ? o.anillos(k) : o.anillos;
        if (a <= 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA(o.colorAnillo || P.accent, 0.22 * a);
        ctx.strokeStyle = hexA(o.colorAnillo || P.accent, 0.8 * a);
        ctx.lineWidth = 2;
        ctx.beginPath();
        anillo.forEach((ai, q) => (q ? ctx.lineTo(pts[ai][0], pts[ai][1]) : ctx.moveTo(pts[ai][0], pts[ai][1])));
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
    }
    ctx.restore();
    return pts;
  }

  // ------------------------------------------------------ ambiente
  function fondo(ctx, t, tono) {
    const g = ctx.createRadialGradient(W * 0.62, H * 0.35, 30, W * 0.5, H * 0.5, W * 0.85);
    g.addColorStop(0, tono === 'azul' ? '#16223F' : '#241838');
    g.addColorStop(0.55, tono === 'azul' ? '#0B1122' : '#120D20');
    g.addColorStop(1, '#06050B');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function bokeh(ctx, t, semilla, n, colores, alfa = 1) {
    const r = mulberry(semilla);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const x0 = r() * W, y0 = r() * H, rad = 8 + r() * 46, vx = (r() - 0.5) * 10, vy = -3 - r() * 8;
      const c = colores[Math.floor(r() * colores.length)];
      const a = (0.05 + r() * 0.12) * alfa * (0.75 + 0.25 * Math.sin(t * 0.7 + i));
      const x = ((x0 + t * vx) % (W + 200) + W + 200) % (W + 200) - 100;
      const y = ((y0 + t * vy) % (H + 200) + H + 200) % (H + 200) - 100;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, hexA(c, a)); gr.addColorStop(0.7, hexA(c, a * 0.8)); gr.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function velo(ctx, x0, x1, fuerza = 0.8, desde = 'izq') {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    const c = a => `rgba(8,6,14,${a})`;
    if (desde === 'izq') { g.addColorStop(0, c(fuerza)); g.addColorStop(1, c(0)); }
    else { g.addColorStop(0, c(0)); g.addColorStop(1, c(fuerza)); }
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), H);
  }

  function rotulo(ctx, x, y, tx, ty, texto, a, o = {}) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    const col = o.color || P.ink;
    ctx.strokeStyle = hexA(col === P.ink ? '#F3EEF8' : col, 0.7); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.lineTo(tx + (tx > x ? 22 : -22), ty); ctx.stroke();
    punto(ctx, x, y, 5, col);
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.stroke();
    const izq = tx < x;
    txt(ctx, texto, tx + (izq ? -30 : 30), ty + 8, { size: o.size || 27, weight: 700, align: izq ? 'right' : 'left', color: P.ink });
    if (o.sub) txt(ctx, o.sub, tx + (izq ? -30 : 30), ty + 36, { family: F.mono, size: 18, align: izq ? 'right' : 'left', color: P.muted });
    ctx.restore();
  }

  function marcaGlow(ctx, x, y, color, a, t, grande) {
    if (a <= 0) return;
    const pulso = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    brillo(ctx, x, y, (grande ? 80 : 58) * (0.85 + 0.15 * pulso), color, a);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, 12 + 5 * pulso, 0, TAU); ctx.stroke();
    punto(ctx, x, y, 6, '#FFFFFF');
    ctx.restore();
  }

  // ====================================================================
  function crear(canvas, D, R) {
    const ctx = canvas.getContext('2d');
    const N = D.offsetNarracion;
    const A = a => a + N;
    const tA = D.tAclaraciones, tR = D.tResumen, TT = D.duracion;
    const TARJ = D.tarjetas;
    const MOL = {};
    (R.mol3d || []).forEach(m => {
      const d2 = D.moleculas.find(x => x.id === m.id);
      MOL[m.id] = prepararMol3D(m, d2 ? d2.anillos : []);
    });
    const MOL2D = {};
    D.moleculas.forEach(m => { MOL2D[m.id] = E.prepararMolecula(m); });
    const neuronaTinte = {
      gaba: tintar(R.img.neurona_sola, '#5C8DFF', 0.55),
      da: tintar(R.img.neurona_sola, '#F2C14E', 0.55),
      nac: tintar(R.img.neurona_sola, '#FF7B6B', 0.55),
    };

    // Subtítulos
    const bloques = [];
    const trocear = (pal, voz) => {
      let act = [];
      const cerrar = () => { if (act.length) bloques.push({ pal: act, t0: act[0].t0, t1: act[act.length - 1].t1, voz }); act = []; };
      for (const w of pal) {
        act.push(w);
        const largo = act.map(p => p.w).join(' ').length, u = w.w[w.w.length - 1];
        if ('.;:?!'.includes(u) || (u === ',' && largo > 26) || largo > 52) cerrar();
      }
      cerrar();
    };
    D.frases.forEach(f => trocear(f.palabras, 'original'));
    D.locuciones.forEach(l => trocear(l.palabras, 'sintetica'));
    bloques.sort((a, b) => a.t0 - b.t0);
    bloques.forEach((b, i) => { b.hasta = Math.min(b.t1 + 0.7, bloques[i + 1] ? bloques[i + 1].t0 - 0.04 : Infinity); });

    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
    function tPalabra(loc, pal, n = 0) {
      if (!loc) return Infinity;
      const obj = norm(pal);
      let c = 0;
      for (const w of loc.palabras) if (norm(w.w).startsWith(obj)) { if (c === n) return w.t0; c++; }
      return Infinity;
    }
    const locDe = t0 => D.locuciones.find(l => Math.abs(l.ini - t0) < 0.05);
    const trazaMec = E.modeloVm(A(52.2), A(62.6), { tOpi: A(54.6), tPre: A(55.2), periodo: 0.55, primero: A(52.35) });

    // Cerebro: posición en pantalla de una secuencia y proyección de regiones
    const REG = ['talamo', 'sgpa', 'atv', 'lc', 'bulbo', 'medula'];
    const NOMBRES = {
      talamo: 'Tálamo', sgpa: 'Sustancia gris periacueductal', atv: 'Área tegmental ventral',
      lc: 'Locus coeruleus', bulbo: 'Bulbo raquídeo · respiración', medula: 'Médula espinal · asta dorsal',
    };
    function regiones(u, x, y, w, h) {
      const m = R.meta.cerebro_rayosx;
      if (!m) return {};
      const n = m.proyecciones.length;
      const uu = clamp(u, 0, n - 1), i0 = Math.floor(uu), i1 = Math.min(n - 1, i0 + 1), f = uu - i0;
      const out = {};
      REG.forEach((k, j) => {
        const a = m.proyecciones[i0][j], b = m.proyecciones[i1][j];
        out[k] = [x + lerp(a[0], b[0], f) * w, y + lerp(a[1], b[1], f) * h];
      });
      return out;
    }
    const nRx = () => (R.meta.cerebro_rayosx ? R.meta.cerebro_rayosx.n : 1);
    const nTj = () => (R.meta.cerebro_tejido ? R.meta.cerebro_tejido.n : 1);

    // ----------------------------------------------------------- escenas
    function intro(t) {
      fondo(ctx, t); bokeh(ctx, t, 3, 26, ['#8C6BFF', '#4F7BFF', '#FF8A7A']);
      const M = MOL.morfina;
      const fm = eOut(prog(t, 0.3, 2.2));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      brillo(ctx, 1380, 520, 520, '#6B4FD8', 0.35 * fm);
      ctx.restore();
      dibujarMol3D(ctx, R, M, { cx: 1380, cy: 530, esc: lerp(70, 92, fm), rotY: -0.9 + t * 0.32, rotX: 0.35, alfa: fm, niebla: 0.6 });
      velo(ctx, 0, 1000, 0.55);
      txt(ctx, 'CLASE DE FARMACOLOGÍA', 150, 330, { family: F.mono, size: 26, weight: 600, color: P.muted, ls: 7, alpha: prog(t, 0.2, 0.8) });
      let x = 140;
      const titulo = 'Opioides';
      for (let i = 0; i < titulo.length; i++) {
        const f = eOut(prog(t, 0.35 + i * 0.07, 0.95 + i * 0.07));
        x += txt(ctx, titulo[i], x, 560 + (1 - f) * 70, { family: F.display, size: 250, weight: 800, stretch: 'condensed', alpha: f, ls: -4 });
      }
      txt(ctx, 'Qué son · dónde actúan · cómo actúan', 150, 650, { size: 46, color: P.muted, alpha: prog(t, 1.2, 1.8) });
      [['μ', P.mu], ['δ', P.delta], ['κ', P.kappa]].forEach(([l, c], i) => {
        const f = eBack(prog(t, 1.9 + i * 0.18, 2.5 + i * 0.18));
        ctx.save(); ctx.globalAlpha *= clamp(f);
        caja(ctx, 150 + i * 96, 700, 76, 76, 38, hexA(c, 0.14), hexA(c, 0.8), 2.5);
        txt(ctx, l, 188 + i * 96, 752, { family: F.greek, italic: true, weight: 700, size: 46, color: c, align: 'center' });
        ctx.restore();
      });
      txt(ctx, 'con aclaraciones rigurosas', 460, 750, { family: F.mono, size: 24, color: P.accent, alpha: prog(t, 1.8, 2.4), ls: 1 });
      txt(ctx, 'Morfina · modelo 3D (MMFF94s)', 1380, 930, { family: F.mono, size: 20, color: P.muted, align: 'center', alpha: prog(t, 2.6, 3.2), ls: 2 });
    }

    function medicamentos(t) {
      const a = t - N;
      const mp = R.meta.pastillas;
      const hx = mp ? mp.heroe[0] : 0.5, hy = mp ? mp.heroe[1] : 0.65;
      const fFoco = eInOut(prog(a, 5.5, 7.0));
      const fSale = eInOut(prog(a, 7.3, 8.1));
      const zoom = lerp(1.0, 1.1, eInOut(prog(a, 1.3, 5.6))) + 0.28 * fFoco;
      const cx = lerp(0.5, hx, fFoco), cy = lerp(0.52, hy, fFoco);
      fondo(ctx, t);
      if (fSale < 1) {
        plano(ctx, R.img.pastillas_fondo, { zoom, cx, cy, alfa: 1 - fSale });
        if (fFoco > 0) plano(ctx, R.img.pastillas_heroe, { zoom, cx, cy, alfa: fFoco * (1 - fSale) });
        velo(ctx, 0, 900, 0.75 * (1 - fFoco * 0.5) * (1 - fSale));
      }
      txt(ctx, 'Hoy hablaremos de', 150, 170, { size: 34, color: P.muted, alpha: prog(a, 1.8, 2.3) * (1 - fFoco) });
      txt(ctx, 'Medicamentos', 150, 250, { family: F.display, size: 92, weight: 800, stretch: 'condensed', alpha: prog(a, 2.6, 3.2) * (1 - fFoco) });
      const fO = prog(a, 6.6, 7.2) * (1 - fSale);
      txt(ctx, 'Opioides', 150, 250, { family: F.display, size: 110, weight: 800, stretch: 'condensed', alpha: fO });
      txt(ctx, 'un grupo de medicamentos', 154, 300, { family: F.mono, size: 24, color: P.accent, alpha: fO });
      // Adormidera
      if (fSale > 0) {
        bokeh(ctx, t, 8, 18, ['#7FE0B8', '#8C6BFF'], fSale);
        const fr = (R.meta.amapola ? R.meta.amapola.n : 1) - 1;
        const u = clamp((a - 7.3) / 3.0, 0, 1) * fr;
        const ah = 1000, aw = ah * 1100 / 1300;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        brillo(ctx, 1380, 470, 420, '#4FB894', 0.25 * fSale);
        ctx.restore();
        secuencia(ctx, R.seq.amapola, u, 1380 - aw / 2, 40, aw, ah, fSale);
        txt(ctx, 'Opioides', 150, 470, { family: F.display, size: 170, weight: 800, stretch: 'condensed', alpha: fSale });
        txt(ctx, 'opio + -oide: «semejante al opio»', 158, 540, { family: F.mono, size: 27, color: P.accent, alpha: prog(a, 7.9, 8.5) });
        parrafo(ctx, 'Papaver somniferum (adormidera): el opio es el látex seco que brota de su cápsula inmadura cuando se le hacen cortes.', 158, 640, 600, { size: 28, color: P.muted, alpha: prog(a, 8.4, 9.0), lh: 38 });
      }
    }

    function sistema(t) {
      const a = t - N;
      fondo(ctx, t, 'azul');
      bokeh(ctx, t, 11, 22, ['#4F7BFF', '#8C6BFF']);
      const bx = 60, by = 0, bw = 1280, bh = 1080;
      const u = clamp((a - 9.3) / 11.3, 0, 1) * 0.8;
      const fX = eInOut(prog(a, 12.6, 13.8));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      brillo(ctx, bx + bw * 0.5, by + bh * 0.45, 560, '#3D6BFF', 0.22);
      ctx.restore();
      secuencia(ctx, R.seq.cerebro_tejido, u * (nTj() - 1), bx, by, bw, bh, 1 - fX);
      secuencia(ctx, R.seq.cerebro_rayosx, u * (nRx() - 1), bx, by, bw, bh, fX);
      const pos = regiones(u * (nRx() - 1), bx, by, bw, bh);
      velo(ctx, 1100, 1920, 0.7, 'der');
      txt(ctx, 'UN GRUPO FARMACOLÓGICO QUE ACTÚA SOBRE EL', 1180, 250, { family: F.mono, size: 21, weight: 600, color: P.muted, ls: 3, alpha: prog(a, 10.0, 10.6) });
      txt(ctx, 'Sistema nervioso', 1174, 345, { family: F.display, size: 100, weight: 800, stretch: 'condensed', alpha: prog(a, 12.4, 13.1) });
      txt(ctx, 'en ciertos receptores del cerebro:', 1180, 425, { size: 31, color: P.muted, alpha: prog(a, 15.8, 16.3) });
      REG.slice(0, 5).forEach((k, i) => {
        const f = prog(a, 16.3 + i * 0.45, 16.8 + i * 0.45);
        if (f <= 0 || !pos[k]) return;
        const [x, y] = pos[k];
        marcaGlow(ctx, x, y, '#C9A8FF', f, t + i);
        const ly = 485 + i * 50;
        ctx.save(); ctx.globalAlpha *= 0.45 * f; ctx.strokeStyle = '#CDB6FF'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.bezierCurveTo(x + 200, y, 1000, ly - 8, 1170, ly - 8); ctx.stroke(); ctx.restore();
        punto(ctx, 1186, ly - 8, 7, P.accent, f);
        txt(ctx, NOMBRES[k], 1208, ly, { size: 29, alpha: f });
      });
      const fP = prog(a, 18.8, 19.8);
      if (pos.medula) {
        marcaGlow(ctx, pos.medula[0], pos.medula[1], P.kappa, fP, t, true);
        rotulo(ctx, pos.medula[0], pos.medula[1], pos.medula[0] + 150, pos.medula[1] - 40, 'Médula espinal', fP, { color: P.kappa, sub: 'asta dorsal' });
      }
      precision(ctx, 1180, 760, 700, null, 'También hay receptores opioides en la médula espinal, los nervios periféricos y el intestino.', fP, { size: 27 });
    }

    function molecula(t) {
      const a = t - N;
      fondo(ctx, t); bokeh(ctx, t, 17, 20, ['#8C6BFF', '#FF8A7A']);
      const M = MOL.morfina;
      const fq = prog(a, 20.9, 21.5), fm = eInOut(prog(a, 23.3, 24.1));
      const fFam = eInOut(prog(a, 33.3, 34.4));
      const pDib = eOut(prog(a, 23.75, 25.2));
      if (pDib > 0) {
        const cx = lerp(740, 400, fFam), cy = lerp(570, 380, fFam), esc = lerp(78, 40, fFam) * lerp(0.7, 1, pDib);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        brillo(ctx, cx, cy, 480 * lerp(1, 0.55, fFam), '#6B4FD8', 0.3 * pDib);
        ctx.restore();
        const fFar = prog(a, 31.0, 31.6) * (1 - 0.4 * fFam);
        dibujarMol3D(ctx, R, M, {
          cx, cy, esc, rotY: -0.6 + (t - A(23.75)) * 0.28, rotX: 0.3, alfa: pDib,
          anillos: i => prog(a, 28.3 + i * 0.5, 28.8 + i * 0.5) * (1 - prog(a, 30.8, 31.4)) * (1 - fFam),
          brillos: [{ atomos: M ? M.grupos.fenol : [], color: P.kappa, a: fFar }, { atomos: M ? M.grupos.amina : [], color: P.mu, a: fFar, r: 4 }],
        });
      }
      txt(ctx, '¿Qué es un opioide?', lerp(W / 2, 150, fm), lerp(560, 170, fm), {
        family: F.display, size: lerp(140, 64, fm), weight: 800, align: fm < 0.5 ? 'center' : 'left', alpha: fq, stretch: 'condensed',
      });
      const fInfo = prog(a, 25.0, 25.6) * (1 - prog(a, 33.0, 33.5));
      if (fInfo > 0) {
        ctx.save(); ctx.globalAlpha *= fInfo;
        velo(ctx, 1080, 1920, 0.6, 'der');
        const m2 = D.moleculas.find(x => x.id === 'morfina');
        txt(ctx, 'Morfina', 1200, 300, { family: F.display, size: 88, weight: 800 });
        txt(ctx, `C₁₇H₁₉NO₃ · ${m2.masa.toFixed(2).replace('.', ',')} g/mol`, 1204, 355, { family: F.mono, size: 28, color: P.accent });
        parrafo(ctx, 'Alcaloide del opio, aislado por Friedrich Sertürner hacia 1804.', 1204, 410, 600, { size: 29, color: P.muted, lh: 38 });
        const fr = prog(a, 28.2, 28.8);
        txt(ctx, 'Núcleo 4,5‑epoximorfinano', 1204, 530, { family: F.display, size: 44, weight: 700, alpha: fr });
        txt(ctx, '5 anillos fusionados · 5 centros quirales', 1204, 574, { size: 28, color: P.muted, alpha: fr });
        // Fórmula estructural 2D de referencia
        ctx.save(); ctx.globalAlpha *= fr;
        caja(ctx, 1204, 610, 300, 220, 16, 'rgba(20,14,34,0.7)', P.panelEdge, 1.5);
        E.dibujarMolecula(ctx, MOL2D.morfina, 1354, 722, 26, { color: P.ink, lw: 2 });
        txt(ctx, 'fórmula estructural', 1354, 856, { family: F.mono, size: 17, color: P.dim, align: 'center' });
        ctx.restore();
        const ff = prog(a, 31.0, 31.6);
        punto(ctx, 1540, 660, 9, P.kappa, ff);
        txt(ctx, 'Fenol', 1560, 668, { size: 29, alpha: ff });
        punto(ctx, 1540, 710, 9, P.mu, ff);
        parrafo(ctx, 'Nitrógeno básico (protonado a pH 7,4)', 1560, 718, 300, { size: 27, alpha: ff, lh: 32 });
        txt(ctx, 'El farmacóforo que reconoce el receptor', 1204, 895, { family: F.mono, size: 20, color: P.accent, alpha: ff });
        ctx.restore();
      }
      if (fFam > 0) {
        txt(ctx, 'Morfina', 400, 560, { family: F.display, size: 36, weight: 700, align: 'center', alpha: fFam });
        txt(ctx, 'referencia', 400, 590, { family: F.mono, size: 21, color: P.muted, align: 'center', alpha: fFam });
        const fam = [['codeina', 'Codeína', '3‑O‑metil · profármaco', 1000, 380],
          ['heroina', 'Heroína', '3,6‑diacetil', 400, 720], ['naloxona', 'Naloxona', 'N‑alilo, 14‑OH → antagonista', 1000, 720]];
        fam.forEach(([id, nom, mod, x, y], i) => {
          const f = eOut(prog(a, 33.8 + i * 0.45, 34.6 + i * 0.45));
          if (f <= 0) return;
          dibujarMol3D(ctx, R, MOL[id], { cx: x, cy: y, esc: 38 * lerp(0.7, 1, f), rotY: 0.4 + i + (t - A(33.8)) * 0.3, rotX: 0.3, alfa: f });
          txt(ctx, nom, x, y + 170, { family: F.display, size: 36, weight: 700, align: 'center', alpha: f });
          txt(ctx, mod, x, y + 200, { family: F.mono, size: 21, color: id === 'naloxona' ? P.kappa : P.muted, align: 'center', alpha: f });
        });
        precision(ctx, 1320, 300, 520, 'Opiáceo ≠ opioide', 'Opiáceo: derivado del opio. Opioide: cualquier sustancia que actúa sobre los receptores opioides, incluidos sintéticos con otra estructura, como el fentanilo y la metadona.', prog(a, 35.4, 36.2), { size: 27 });
      }
    }

    function receptores(t) {
      const a = t - N;
      fondo(ctx, t, 'azul');
      const mn = R.meta.neurona, mm = R.meta.membrana;
      const fZ = eInOut(prog(a, 41.2, 42.8));
      if (fZ < 1) {
        const tgt = mn ? mn.membrana : [0.6, 0.5];
        const zoom = lerp(1.0, 1.25, eInOut(prog(a, 38.3, 41.2))) + 2.2 * fZ * fZ;
        const cx = lerp(0.48, tgt[0], eInOut(prog(a, 38.3, 42.0))), cy = lerp(0.5, tgt[1], eInOut(prog(a, 38.3, 42.0)));
        const map = plano(ctx, R.img.neurona_red, { zoom, cx, cy, alfa: 1 - fZ, desenfoque: fZ > 0.05 ? 14 * fZ : 0 });
        if (map && mn) {
          const [x, y] = map(tgt[0], tgt[1]);
          rotulo(ctx, x, y, x + 160, y - 120, 'Membrana neuronal', prog(a, 39.8, 40.4) * (1 - prog(a, 41.0, 41.5)), { color: P.accent });
        }
      }
      let variante = 'nop';
      [['kappa', 47.45], ['mu', 49.1], ['delta', 49.95], ['nop', 50.7]].forEach(([v, tt]) => { if (a >= tt) variante = v; });
      if (fZ > 0) {
        const zoom = lerp(1.35, 1.0, eOut(fZ)) + 0.1 * eInOut(prog(a, 42.8, 51.8));
        const bol = mm ? mm.bolsillo : [0.45, 0.4];
        const cx = lerp(bol[0], 0.52, 0.5), cy = 0.52;
        let map = null;
        const orden = ['nop', 'kappa', 'mu', 'delta', 'nop'];
        const cambios = [0, 47.45, 49.1, 49.95, 50.7];
        let k = 0;
        cambios.forEach((c, i) => { if (a >= c) k = i; });
        const fc = k > 0 ? eInOut(prog(a, cambios[k], cambios[k] + 0.45)) : 1;
        if (k > 0) plano(ctx, R.img['membrana_' + orden[k - 1]], { zoom, cx, cy, alfa: fZ, desenfoque: (1 - fZ) * 12 });
        map = plano(ctx, R.img['membrana_' + orden[k]], { zoom, cx, cy, alfa: fZ * (k > 0 ? fc : 1), desenfoque: (1 - fZ) * 12 });
        if (map && mm) {
          const [bxp, byp] = map(bol[0], bol[1]);
          const [gx, gy] = map(mm.gprot[0], mm.gprot[1]);
          const [ex, ey] = map(mm.exterior[0], mm.exterior[1]);
          const [ix, iy] = map(mm.interior[0], mm.interior[1]);
          txt(ctx, 'EXTERIOR', 1880, Math.max(80, ey - 120), { family: F.mono, size: 21, color: P.muted, ls: 4, align: 'right', alpha: prog(a, 43.0, 43.6) });
          txt(ctx, 'CITOPLASMA', 1880, Math.min(900, iy + 40), { family: F.mono, size: 21, color: P.muted, ls: 4, align: 'right', alpha: prog(a, 43.0, 43.6) });
          rotulo(ctx, bxp + 70, byp - 40, 1450, 250, 'Receptor acoplado a proteína G', prog(a, 43.0, 43.8), { sub: '7 hélices transmembrana' });
          rotulo(ctx, bxp, byp, bxp - 260, byp - 150, 'Morfina en el sitio de unión', prog(a, 44.6, 45.4), { color: P.drug, sub: 'a escala real (≈1 nm)' });
          rotulo(ctx, gx + 40, gy, 1450, gy + 60, 'Proteína G inhibidora (Gi/o)', prog(a, 45.2, 46.0), { sub: 'Gα · Gβ · Gγ' });
        }
      }
      txt(ctx, '¿Dónde interactúan?', 150, 110, { family: F.display, size: 60, weight: 800, stretch: 'condensed', alpha: prog(a, 38.7, 39.3) });
      const cards = [
        { l: 'κ', n: 'kappa', c: P.kappa, cod: 'KOP · OPRK1', lig: 'Dinorfinas', t: 47.45 },
        { l: 'μ', n: 'mu', c: P.mu, cod: 'MOP · OPRM1', lig: 'β‑endorfina, endomorfinas', t: 49.1 },
        { l: 'δ', n: 'delta', c: P.delta, cod: 'DOP · OPRD1', lig: 'Encefalinas', t: 49.95, nota: true },
        { l: 'NOP', n: 'nociceptina', c: P.nop, cod: 'NOP · OPRL1', lig: 'Nociceptina / orfanina FQ', t: 50.7, prec: true },
      ];
      cards.forEach((c, i) => {
        const f = eBack(prog(a, c.t, c.t + 0.5));
        if (f <= 0) return;
        const x = 60, y = 170 + i * 172, w = 430, h = 156;
        ctx.save(); ctx.globalAlpha *= clamp(f); ctx.translate((1 - clamp(f)) * -40, 0);
        caja(ctx, x, y, w, h, 18, 'rgba(14,10,26,0.82)', hexA(c.c, 0.8), 2.5);
        if (c.prec) {
          txt(ctx, 'NOP', x + 24, y + 78, { family: F.display, size: 58, weight: 800, color: c.c });
          txt(ctx, 'PRECISIÓN · 4.º RECEPTOR', x + w - 20, y + 34, { family: F.mono, size: 15, weight: 600, color: P.accent, align: 'right', ls: 1.5 });
        } else {
          txt(ctx, c.l, x + 26, y + 92, { family: F.greek, italic: true, weight: 700, size: 92, color: c.c, glow: hexA(c.c, 0.5) });
          txt(ctx, c.n, x + 104, y + 70, { family: F.display, size: 42, weight: 700 });
        }
        if (c.nota) txt(ctx, 'poco audible en el audio', x + w - 20, y + 34, { family: F.mono, size: 15, color: P.delta, align: 'right' });
        txt(ctx, c.cod, x + 26, y + 116, { family: F.mono, size: 19, color: P.muted });
        txt(ctx, c.lig, x + 26, y + 143, { size: 23 });
        ctx.restore();
      });
    }

    function mecanismo(t) {
      const a = t - N;
      fondo(ctx, t, 'azul');
      const ms = R.meta.sinapsis;
      const fS = prog(a, 51.8, 52.6);
      const map = plano(ctx, R.img.sinapsis, { zoom: lerp(1.02, 1.1, eInOut(prog(a, 51.8, 62.5))), cx: 0.47, cy: 0.5, alfa: fS });
      if (!map || !ms) return;
      const P2 = p => map(p[0], p[1]);
      const tLib = A(55.2);
      const cierreCa = eInOut(prog(a, 55.0, 55.8)), aperturaK = eInOut(prog(a, 54.4, 55.0));
      const [hx0, hy0] = P2(ms.hendidura[0]), [hx1, hy1] = P2(ms.hendidura[1]);
      const [cax, cay] = P2(ms.ca[0]), [gix, giy] = P2(ms.girk[0]);
      const [dpx, dpy] = P2(ms.dentro_pre[0]), [dqx, dqy] = P2(ms.dentro_post[0]);
      const ion = (k, x, y, r, al) => { const im = R.img[k]; if (!im || al <= 0) return; ctx.save(); ctx.globalAlpha *= al; ctx.drawImage(im, x - r, y - r, 2 * r, 2 * r); ctx.restore(); };
      // Liberación de neurotransmisor
      for (let te = A(51.9), idx = 0; te < tA + 1; te += 0.62, idx++) {
        if (!(te < tLib || idx % 4 === 0)) continue;
        const d = t - te;
        if (d < 0 || d > 1.3) continue;
        const [fx, fy] = P2(ms.fusion[idx % ms.fusion.length]);
        const rr = mulberry(idx + 3);
        for (let k = 0; k < 10; k++) {
          const ang = Math.PI / 2 + (rr() - 0.5) * 1.8, v = 50 + rr() * 60;
          ion('ion_NT', fx + Math.cos(ang) * v * d, fy + Math.sin(ang) * v * d * 0.8, 6, fS * (1 - d / 1.3));
        }
      }
      // Ca2+ que entra (antes) o rebota (después)
      for (let k = 0; k < 6; k++) {
        const q = (t * 0.8 + k / 6) % 1;
        const x = cax + Math.sin(k * 2.1) * 10;
        const y = cierreCa < 0.5 ? lerp(cay + 70, dpy, q) : cay + 70 - Math.sin(q * Math.PI) * 45;
        ion('ion_Ca', x, y, 11, fS * Math.sin(q * Math.PI));
      }
      // K+ que sale por el GIRK
      for (let k = 0; k < 8; k++) {
        const q = (t * 0.75 + k / 8) % 1;
        ion('ion_K', gix + Math.cos(k * 1.7) * 12 + q * Math.cos(k) * 40, lerp(dqy, giy - 70, q), 11, aperturaK * Math.sin(q * Math.PI));
      }
      // Ligandos opioides (morfina 3D) que llegan a los receptores μ
      const recs = ms.mu_pre.map(p => [p, true]).concat(ms.mu_post.map(p => [p, false]));
      recs.forEach(([p, pre], i) => {
        const f = eInOut(prog(a, 51.95 + i * 0.25, 53.0 + i * 0.25));
        if (f <= 0) return;
        const [rx, ry] = P2(p);
        const tx = rx, ty = ry + (pre ? 26 : -26);
        const lx = lerp(-60, tx, f), ly = lerp(hy0 + (i - 1.5) * 20, ty, f) - Math.sin(f * Math.PI) * 50;
        if (f >= 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; brillo(ctx, rx, ry, 70, P.mu, 0.6 + 0.3 * Math.sin(t * 5 + i)); ctx.restore(); }
        dibujarMol3D(ctx, R, MOL.morfina, { cx: lx, cy: ly, esc: 4.6, rotY: t * 1.2 + i, rotX: 0.5 + i, niebla: 0.3 });
      });
      const fA = prog(a, 53.3, 53.9);
      txt(ctx, 'Gi/o activa → ↓ AMPc', dpx - 120, dpy - 40, { family: F.mono, size: 22, color: P.accent, alpha: fA });
      txt(ctx, 'Gi/o activa → ↓ AMPc', dqx - 120, dqy + 70, { family: F.mono, size: 22, color: P.accent, alpha: fA });
      rotulo(ctx, gix, giy, gix - 250, giy + 150, 'Sale K⁺ (canal GIRK)', prog(a, 54.8, 55.4), { color: P.k, sub: 'la neurona se hiperpolariza' });
      rotulo(ctx, cax, cay, cax - 300, cay - 190, 'Entra menos Ca²⁺', prog(a, 55.6, 56.2), { color: P.ca, sub: 'se libera menos neurotransmisor' });
      txt(ctx, 'hendidura sináptica', hx1 + 240, hy1 + 8, { family: F.mono, size: 20, color: P.muted, alpha: fS });
      // Panel derecho: potencial de membrana, precisión y vía del dolor
      const gx = 1290, gy = 150, gw = 540, gh = 300;
      const fG = prog(a, 52.3, 53.0);
      ctx.save(); ctx.globalAlpha *= fG;
      caja(ctx, 1200, 70, 680, 470, 20, 'rgba(8,6,16,0.78)', P.panelEdge, 1.5);
      txt(ctx, 'POTENCIAL DE MEMBRANA · POSTSINÁPTICA', 1230, 115, { family: F.mono, size: 18, weight: 600, color: P.muted, ls: 2 });
      const np = E.dibujarTraza(ctx, trazaMec, gx, gy, gw, gh, t, { tOpi: A(54.6), fs: 17 });
      txt(ctx, `Potenciales de acción: ${np}`, 1230, 510, { family: F.mono, size: 21, color: P.ink });
      txt(ctx, 'modelo ilustrativo', 1850, 510, { family: F.mono, size: 17, color: P.dim, align: 'right' });
      ctx.restore();
      precision(ctx, 1200, 560, 680, null, 'No cambian la forma del potencial de acción: hacen menos probable que se dispare.', prog(a, 57.6, 58.3), { size: 26 });
      const fV = prog(a, 57.4, 58.0);
      if (fV > 0) {
        ctx.save(); ctx.globalAlpha *= fV;
        caja(ctx, 1200, 720, 680, 190, 20, 'rgba(8,6,16,0.78)', P.panelEdge, 1.5);
        const yv = 815;
        txt(ctx, 'SEÑAL DE DOLOR', 1230, 760, { family: F.mono, size: 18, weight: 600, color: P.muted, ls: 2 });
        ctx.strokeStyle = P.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(1260, yv); ctx.lineTo(1820, yv); ctx.stroke();
        const atenua = 1 - 0.8 * eInOut(prog(a, 58.2, 60.5));
        for (let k = 0; k < 3; k++) {
          const q = (t * 0.7 + k / 3) % 1, x = lerp(1260, 1820, q), amp = q < 0.5 ? 1 : atenua;
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; brillo(ctx, x, yv, 34 * amp + 8, P.mu, amp); ctx.restore();
          punto(ctx, x, yv, 6 * amp + 2, P.mu, amp);
        }
        [['Nociceptor', 1260], ['Médula', 1540], ['Cerebro', 1820]].forEach(([n, x], i) => {
          punto(ctx, x, yv, 13, i === 2 ? hexA(P.mu, 0.35 + 0.65 * atenua) : P.ink);
          txt(ctx, n, x, yv + 44, { family: F.mono, size: 19, color: P.muted, align: 'center' });
        });
        txt(ctx, 'Menos señal de dolor → analgesia', 1540, 895, { family: F.display, size: 30, weight: 700, align: 'center', alpha: prog(a, 60.2, 60.9) });
        ctx.restore();
      }
    }

    // ---------------------------------------------- aclaraciones (TTS)
    function visualTarjeta(c, t) {
      const loc = locDe(c.t_voz);
      const tw = (p, n) => tPalabra(loc, p, n);
      const x0 = 960, y0 = 150, w0 = 900, h0 = 760;
      if (c.id === 'ubicacion') {
        const bw = 900, bh = 760, bx = 960, by = 150;
        const u = (0.8 + 0.2 * clamp((t - c.t_ini) / (c.t_fin - c.t_ini))) * (nRx() - 1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; brillo(ctx, bx + bw / 2, by + bh * 0.45, 420, '#3D6BFF', 0.22); ctx.restore();
        secuencia(ctx, R.seq.cerebro_rayosx, u, bx, by, bw, bh);
        const pos = regiones(u, bx, by, bw, bh);
        REG.slice(0, 5).forEach((k, i) => marcaGlow(ctx, pos[k][0], pos[k][1], '#C9A8FF', prog(t, tw('cerebro') - 0.2, tw('cerebro') + 0.3), t + i));
        const fm = prog(t, tw('medula') - 0.2, tw('medula') + 0.4);
        if (pos.medula) {
          marcaGlow(ctx, pos.medula[0], pos.medula[1], P.kappa, fm, t, true);
          rotulo(ctx, pos.medula[0], pos.medula[1], pos.medula[0] + 150, pos.medula[1] - 60, 'Médula espinal', fm, { color: P.kappa, sub: 'asta dorsal, láminas I–II' });
        }
        const fn = prog(t, tw('nervios') - 0.2, tw('nervios') + 0.4), fi = prog(t, tw('intestino') - 0.2, tw('intestino') + 0.4);
        ctx.save(); ctx.globalAlpha *= fn;
        caja(ctx, 1480, 600, 360, 64, 32, 'rgba(14,10,26,0.8)', hexA(P.kappa, 0.8), 2);
        txt(ctx, '+ nervios periféricos', 1660, 642, { size: 26, weight: 700, align: 'center', color: P.kappa });
        ctx.restore();
        ctx.save(); ctx.globalAlpha *= fi;
        caja(ctx, 1480, 680, 360, 64, 32, 'rgba(14,10,26,0.8)', hexA(P.kappa, 0.8), 2);
        txt(ctx, '+ intestino', 1660, 722, { size: 26, weight: 700, align: 'center', color: P.kappa });
        ctx.restore();
      } else if (c.id === 'definicion') {
        const items = [['morfina', 'Opiáceo · natural', 1410, 330, tw('morfina'), P.delta],
          ['fentanilo', 'Opioide sintético', 1170, 690, tw('fentanilo'), P.kappa],
          ['metadona', 'Opioide sintético', 1650, 690, tw('metadona'), P.kappa]];
        const fN = prog(t, tw('naloxona') - 0.2, tw('naloxona') + 0.4) + prog(t, c.t_fin_voz - 1.6, c.t_fin_voz - 0.8);
        items.forEach(([id, et, x, y, te, col], i) => {
          const f = eOut(prog(t, te - 0.3, te + 0.5));
          if (f <= 0) return;
          const M = MOL[id];
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; brillo(ctx, x, y, 240, '#6B4FD8', 0.2 * f); ctx.restore();
          dibujarMol3D(ctx, R, M, { cx: x, cy: y, esc: 30 * lerp(0.7, 1, f), rotY: i * 1.3 + (t - te) * 0.35, rotX: 0.3, alfa: f,
            brillos: [{ atomos: M ? M.grupos.amina : [], color: P.mu, a: clamp(fN), r: 4.5 }] });
          txt(ctx, M ? M.nombre.split(' ')[0] : id, x, y + 175, { family: F.display, size: 32, weight: 700, align: 'center', alpha: f });
          txt(ctx, et, x, y + 205, { family: F.mono, size: 20, color: col, align: 'center', alpha: f });
        });
        txt(ctx, 'En común: un nitrógeno básico', 1410, 950 - 60, { family: F.mono, size: 22, color: P.mu, align: 'center', alpha: prog(t, c.t_fin_voz - 1.6, c.t_fin_voz - 0.8) });
      } else if (c.id === 'receptores') {
        const rs = [['μ', 'MOP', P.mu, 'mu', 'β‑endorfina', 'Analgesia, euforia, depresión respiratoria', tw('mu')],
          ['δ', 'DOP', P.delta, 'delta', 'Encefalinas', 'Analgesia, estado de ánimo', tw('delta')],
          ['κ', 'KOP', P.kappa, 'kappa', 'Dinorfinas', 'Analgesia espinal, disforia, diuresis', tw('kappa')],
          ['NOP', 'NOP', P.nop, 'nop', 'Nociceptina', 'No la bloquea la naloxona', tw('nociceptina')]];
        const fG = prog(t, tw('inhibidoras') - 0.4, tw('inhibidoras') + 0.3);
        const mm = R.meta.membrana;
        rs.forEach(([l, cod, col, img, lig, ef, te], i) => {
          const f = eBack(prog(t, te - 0.25, te + 0.3));
          if (f <= 0) return;
          const x = 960 + (i % 2) * 450, y = 150 + Math.floor(i / 2) * 380, w = 430, h = 360;
          ctx.save(); ctx.globalAlpha *= clamp(f);
          ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.save(); ctx.clip();
          const im = R.img['membrana_' + img];
          if (im && mm) {
            const s = 1.1, iw = im.width, ih = im.height;
            const sw = w / s, sh = h / s;
            const sx = clamp(mm.bolsillo[0] * iw - sw / 2 - 30, 0, iw - sw), sy = clamp(mm.bolsillo[1] * ih - sh * 0.38, 0, ih - sh);
            ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
          }
          const g = ctx.createLinearGradient(0, y + h * 0.45, 0, y + h);
          g.addColorStop(0, 'rgba(8,6,16,0)'); g.addColorStop(1, 'rgba(8,6,16,0.92)');
          ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
          ctx.restore();
          ctx.strokeStyle = hexA(col, 0.85); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.stroke();
          if (l === 'NOP') txt(ctx, 'NOP', x + 22, y + 266, { family: F.display, size: 50, weight: 800, color: col });
          else txt(ctx, l, x + 22, y + 276, { family: F.greek, italic: true, weight: 700, size: 76, color: col, glow: hexA(col, 0.5) });
          txt(ctx, `${cod} · ${lig}`, x + 110, y + 250, { family: F.mono, size: 18, color: P.muted });
          parrafo(ctx, ef, x + 110, y + 284, 300, { size: 22, lh: 27 });
          if (fG > 0) {
            caja(ctx, x + w - 104, y + 18, 86, 36, 18, hexA(P.accent, 0.2 * fG), hexA(P.accent, 0.85 * fG), 2);
            txt(ctx, 'Gi/o', x + w - 61, y + 43, { family: F.mono, size: 20, weight: 600, color: P.accent, align: 'center', alpha: fG });
          }
          ctx.restore();
        });
      } else if (c.id === 'potencial') {
        const tK = tw('potasio'), tCa = tw('calcio');
        const ms = R.meta.sinapsis;
        const fF = prog(t, c.t_voz, c.t_voz + 0.6);
        ctx.save(); ctx.globalAlpha *= fF;
        caja(ctx, 960, 150, 880, 250, 20, 'rgba(8,6,16,0.8)', P.panelEdge, 1.5);
        txt(ctx, 'FORMA DEL POTENCIAL DE ACCIÓN', 990, 190, { family: F.mono, size: 18, weight: 600, color: P.muted, ls: 2 });
        const ap = [-70, -69, -66, -58, -40, 10, 32, 20, -10, -45, -70, -80, -78, -74, -71, -70, -70];
        const dib = (col, dash) => {
          ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 4; if (dash) ctx.setLineDash([10, 9]);
          ctx.beginPath();
          ap.forEach((v, i) => { const x = 1000 + i * 18, y = 380 - (v + 90) * 1.35; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.stroke(); ctx.restore();
        };
        dib(P.k, false); dib(P.drug, true);
        txt(ctx, 'sin opioide', 1330, 270, { family: F.mono, size: 20, color: P.k });
        txt(ctx, 'con opioide (igual)', 1330, 302, { family: F.mono, size: 20, color: P.drug });
        if (R.img.ion_K) { ctx.drawImage(R.img.ion_K, 1650, 220, 60, 60); txt(ctx, 'K⁺', 1720, 262, { family: F.mono, size: 26, weight: 600, color: P.k }); }
        if (R.img.ion_Ca) { ctx.drawImage(R.img.ion_Ca, 1650, 300, 60, 60); txt(ctx, 'Ca²⁺', 1720, 342, { family: F.mono, size: 26, weight: 600, color: P.ca }); }
        ctx.restore();
        const sin = E.modeloVm(0, 4, { tOpi: 99, tPre: 99, periodo: 0.55, primero: 0.2 });
        const con = E.modeloVm(0, 4, { tOpi: -10, tPre: -10, periodo: 0.55, primero: 0.2 });
        const fR = prog(t, tK - 0.3, tK + 0.4), fC = prog(t, tCa - 0.3, tCa + 0.4);
        ctx.save(); ctx.globalAlpha *= fR;
        caja(ctx, 960, 420, 880, 230, 20, 'rgba(8,6,16,0.8)', P.panelEdge, 1.5);
        txt(ctx, 'SIN OPIOIDE', 1060, 458, { family: F.mono, size: 18, weight: 600, color: P.muted, ls: 2 });
        E.dibujarTraza(ctx, sin, 1060, 475, 740, 150, 4, { fs: 16, lw: 2.5 });
        ctx.restore();
        ctx.save(); ctx.globalAlpha *= fC;
        caja(ctx, 960, 670, 880, 230, 20, 'rgba(8,6,16,0.8)', P.panelEdge, 1.5);
        txt(ctx, 'CON OPIOIDE: HIPERPOLARIZADA, EPSP MENORES', 1060, 708, { family: F.mono, size: 18, weight: 600, color: P.muted, ls: 2 });
        E.dibujarTraza(ctx, con, 1060, 725, 740, 150, 4, { fs: 16, lw: 2.5, color: P.drug });
        ctx.restore();
      } else if (c.id === 'depresion') {
        const tD = tw('desinhiben'), tDo = tw('dopamina'), tS = tw('sobredosis'), tN = tw('naloxona');
        const fOp = prog(t, tD - 0.2, tD + 0.6);
        txt(ctx, 'CIRCUITO DE RECOMPENSA (ATV → NÚCLEO ACCUMBENS)', 980, 180, { family: F.mono, size: 18, weight: 600, color: P.muted, ls: 2 });
        const nodos = [['gaba', 1080, 330, 'Interneurona', 'GABA', 1 - 0.8 * fOp, P.k],
          ['da', 1400, 330, 'Neurona de', 'dopamina (ATV)', 0.35 + 0.65 * prog(t, tDo - 0.6, tDo + 0.2), P.delta],
          ['nac', 1720, 330, 'Núcleo', 'accumbens', 0.3 + 0.7 * prog(t, tDo - 0.3, tDo + 0.5), P.mu]];
        ctx.save(); ctx.strokeStyle = hexA('#F3EEF8', 0.55); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(1170, 330); ctx.lineTo(1300, 330); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(1300, 306); ctx.lineTo(1300, 354); ctx.stroke();
        flecha(ctx, 1500, 330, 1620, 330, hexA('#F3EEF8', 0.55), 4, 18);
        ctx.restore();
        txt(ctx, 'inhibe (−)', 1235, 300, { family: F.mono, size: 17, color: P.dim, align: 'center' });
        nodos.forEach(([k, x, y, e1, e2, act, col]) => {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; brillo(ctx, x, y, 150, col, act * 0.8); ctx.restore();
          const im = neuronaTinte[k];
          if (im) { ctx.save(); ctx.globalAlpha *= 0.35 + 0.65 * act; const w = 260, h = w * im.height / im.width; ctx.drawImage(im, x - w * 0.42, y - h / 2, w, h); ctx.restore(); }
          txt(ctx, e1, x, y + 110, { size: 25, weight: 700, align: 'center' });
          txt(ctx, e2, x, y + 140, { family: F.mono, size: 17, color: P.muted, align: 'center' });
        });
        if (fOp > 0) {
          dibujarMol3D(ctx, R, MOL.morfina, { cx: 1040, cy: 230, esc: 6, rotY: t, rotX: 0.4, alfa: fOp, niebla: 0.3 });
          txt(ctx, 'μ', 1110, 238, { family: F.greek, italic: true, weight: 700, size: 34, color: P.mu, alpha: fOp });
        }
        const fS = prog(t, tS - 0.3, tS + 0.4), fNa = prog(t, tN - 0.3, tN + 0.4);
        txt(ctx, 'SOBREDOSIS: TRÍADA CLÁSICA', 980, 560, { family: F.mono, size: 18, weight: 600, color: P.muted, ls: 2, alpha: fS });
        ['Depresión respiratoria', 'Miosis (pupilas puntiformes)', 'Coma'].forEach((s, i) => {
          const f = prog(t, tS - 0.2 + i * 0.25, tS + 0.3 + i * 0.25);
          ctx.save(); ctx.globalAlpha *= f;
          caja(ctx, 980, 590 + i * 76, 520, 60, 30, hexA(P.mu, i === 0 ? 0.22 : 0.1), hexA(P.mu, 0.7), 2);
          txt(ctx, s, 1008, 630 + i * 76, { size: 26, weight: i === 0 ? 700 : 400 });
          ctx.restore();
        });
        ctx.save(); ctx.globalAlpha *= fNa;
        caja(ctx, 1540, 590, 300, 212, 22, hexA(P.kappa, 0.14), hexA(P.kappa, 0.85), 2.5);
        txt(ctx, 'ANTÍDOTO', 1566, 632, { family: F.mono, size: 18, weight: 600, color: P.kappa, ls: 2 });
        txt(ctx, 'Naloxona', 1566, 686, { family: F.display, size: 44, weight: 800 });
        parrafo(ctx, 'antagonista competitivo de acción corta', 1566, 726, 250, { size: 22, color: P.muted, lh: 27 });
        ctx.restore();
      }
    }

    function aclaraciones(t) {
      fondo(ctx, t);
      bokeh(ctx, t, 23, 16, ['#8C6BFF', '#4F7BFF']);
      const t1 = TARJ[0].t_ini;
      const fTit = prog(t, tA, tA + 0.6) * (1 - prog(t, t1 - 0.5, t1));
      if (fTit > 0) {
        ctx.save(); ctx.globalAlpha *= fTit;
        dibujarMol3D(ctx, R, MOL.morfina, { cx: W / 2, cy: 540, esc: 120, rotY: t * 0.2, rotX: 0.3, alfa: 0.18, niebla: 0.7 });
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
        ctx.translate((1 - eOut(prog(t, c.t_ini, c.t_ini + 0.7))) * 60, 0);
        visualTarjeta(c, t);
        velo(ctx, 0, 960, 0.55);
        txt(ctx, `ACLARACIÓN ${k + 1}/${TARJ.length}`, 120, 110, { family: F.mono, size: 22, weight: 600, color: P.accent, ls: 4 });
        txt(ctx, c.tema, 460, 110, { family: F.mono, size: 22, color: P.muted });
        for (let i = 0; i < TARJ.length; i++) punto(ctx, 1690 + i * 26, 102, 7, i === k ? P.accent : P.dim);
        const m = Math.floor(c.t_audio / 60), s = Math.floor(c.t_audio % 60);
        txt(ctx, 'DIJIMOS', 120, 200, { family: F.mono, size: 20, weight: 600, color: P.muted, ls: 3 });
        caja(ctx, 250, 176, 150, 34, 17, 'rgba(255,255,255,0.06)', P.line, 1.5);
        txt(ctx, `audio ${m}:${String(s).padStart(2, '0')}`, 325, 200, { family: F.mono, size: 18, color: P.muted, align: 'center' });
        const hq = parrafo(ctx, c.dijimos, 120, 258, 740, { size: 38, italic: true, color: hexA('#F3EEF8', 0.72), lh: 48 });
        const yp = 258 + hq + 20;
        ctx.fillStyle = P.line; ctx.fillRect(120, yp, 740, 2);
        txt(ctx, 'CON MÁS PRECISIÓN', 120, yp + 56, { family: F.mono, size: 20, weight: 600, color: P.accent, ls: 3 });
        const ht = parrafo(ctx, c.titular, 120, yp + 124, 760, { family: F.display, size: 58, weight: 750, lh: 64, stretch: 'semi-condensed' });
        const durV = c.t_fin_voz - c.t_voz;
        c.puntos.forEach((pt, i) => {
          const tp = c.t_voz + durV * [0.02, 0.36, 0.66][i];
          const fp = prog(t, tp, tp + 0.5);
          const y = yp + 124 + ht + 30 + i * 84;
          punto(ctx, 132, y - 10, 7, P.accent, fp);
          parrafo(ctx, pt, 156, y, 700, { size: 31, alpha: fp, lh: 38 });
        });
        ctx.restore();
      });
    }

    function resumen(t) {
      fondo(ctx, t);
      bokeh(ctx, t, 31, 18, ['#8C6BFF', '#FF8A7A']);
      const f0 = prog(t, tR, tR + 0.6);
      dibujarMol3D(ctx, R, MOL.morfina, { cx: 1560, cy: 540, esc: 58, rotY: t * 0.25, rotX: 0.3, alfa: 0.55 * f0, niebla: 0.7 });
      velo(ctx, 0, 1500, 0.7);
      txt(ctx, 'En resumen', 150, 200, { family: F.display, size: 96, weight: 800, stretch: 'condensed', alpha: f0 });
      const ideas = [
        [P.accent, 'Un opioide es toda sustancia que actúa sobre los receptores opioides: μ, δ, κ (y NOP).'],
        [P.kappa, 'Son receptores acoplados a proteínas Gi/o: ↓ AMPc, ↑ salida de K⁺ (GIRK), ↓ entrada de Ca²⁺.'],
        [P.mu, 'Uso terapéutico principal: analgesia. Riesgo principal: depresión respiratoria; antídoto, naloxona.'],
      ];
      ideas.forEach(([c, s], i) => {
        const f = eOut(prog(t, tR + 0.6 + i * 0.7, tR + 1.3 + i * 0.7));
        const y = 330 + i * 150;
        ctx.save(); ctx.globalAlpha *= f; ctx.translate((1 - f) * 40, 0);
        ctx.fillStyle = c; ctx.fillRect(150, y - 8, 8, 96);
        parrafo(ctx, s, 190, y + 30, 1150, { size: 40, lh: 52 });
        ctx.restore();
      });
      txt(ctx, 'Fuentes: Goodman & Gilman, 14.ª ed. · Katzung, 16.ª ed. · IUPHAR/BPS Guide to Pharmacology', 150, 850, { family: F.mono, size: 21, color: P.muted, alpha: prog(t, tR + 2.6, tR + 3.2) });
      txt(ctx, 'Renders: Blender Cycles · cerebro: FreeSurfer fsaverage · moléculas: RDKit (MMFF94s)', 150, 884, { family: F.mono, size: 18, color: P.dim, alpha: prog(t, tR + 2.9, tR + 3.5) });
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
      const fs = 44, o = { size: fs, family: F.body, weight: 700 };
      const esp = U.medir(ctx, ' ', o);
      const anchos = b.pal.map(p => U.medir(ctx, p.w, o));
      const total = anchos.reduce((s, w) => s + w, 0) + esp * (anchos.length - 1);
      const a = Math.min(prog(t, b.t0 - 0.12, b.t0 + 0.05), 1 - prog(t, b.hasta - 0.15, b.hasta));
      const x0 = W / 2 - total / 2, y = H - 74;
      ctx.save();
      ctx.globalAlpha *= a;
      caja(ctx, x0 - 30, y - fs - 12, total + 60, fs + 36, 16, 'rgba(8,6,14,0.74)');
      let x = x0;
      b.pal.forEach((p, i) => {
        const dicha = t >= p.t1, actual = t >= p.t0 && t < p.t1;
        txt(ctx, p.w, x, y, { ...o, color: actual ? P.accent : dicha ? P.ink : hexA('#F3EEF8', 0.5) });
        if (actual) { ctx.fillStyle = P.accent; ctx.fillRect(x, y + 9, anchos[i], 3); }
        x += anchos[i] + esp;
      });
      ctx.restore();
    }

    function capitulo(t) {
      const e = ESCENAS.filter(s => t >= s.ini + 0.2).pop();
      if (!e || t < 5 || e.sinEtiqueta) return;
      const a = prog(t, 5, 5.6) * (1 - prog(t, TT - 1.2, TT - 0.4));
      txt(ctx, 'OPIOIDES', W - 60, 50, { family: F.mono, size: 17, weight: 600, color: P.dim, ls: 4, align: 'right', alpha: a });
      txt(ctx, e.cap.toUpperCase(), W - 60, 76, { family: F.mono, size: 17, color: P.muted, ls: 2, align: 'right', alpha: a });
    }

    function grano() {
      if (!grano.patron) {
        const c = document.createElement('canvas'); c.width = c.height = 256;
        const g = c.getContext('2d'), img = g.createImageData(256, 256), r = mulberry(7);
        for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 9; }
        g.putImageData(img, 0, 0);
        grano.patron = ctx.createPattern(c, 'repeat');
      }
      ctx.fillStyle = grano.patron; ctx.fillRect(0, 0, W, H);
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H * 1.05);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }

    function dibujar(t) {
      const k = canvas.width / W;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      ctx.fillStyle = FONDO; ctx.fillRect(0, 0, W, H);
      for (const e of ESCENAS) {
        const al = Math.min(prog(t, e.ini, e.ini + 0.5), 1 - prog(t, e.fin - 0.5, e.fin));
        if (al <= 0) continue;
        ctx.save(); ctx.globalAlpha = al; e.fn(t); ctx.restore();
      }
      grano();
      capitulo(t);
      subtitulos(t);
      const negro = Math.max(1 - prog(t, 0, 0.6), prog(t, TT - 0.8, TT));
      if (negro > 0) { ctx.fillStyle = `rgba(4,3,8,${negro})`; ctx.fillRect(0, 0, W, H); }
    }

    function miniatura() {
      const k = canvas.width / W;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalAlpha = 1;
      fondo(ctx, 0, 'azul');
      bokeh(ctx, 2, 5, 24, ['#4F7BFF', '#8C6BFF', '#FF8A7A']);
      const nrx = nRx();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; brillo(ctx, 1330, 470, 560, '#3D6BFF', 0.35); ctx.restore();
      secuencia(ctx, R.seq.cerebro_rayosx, Math.round(nrx * 0.45), 760, -20, 1180, 996);
      const pos = regiones(Math.round(nrx * 0.45), 760, -20, 1180, 996);
      REG.slice(0, 5).forEach((r, i) => marcaGlow(ctx, pos[r][0], pos[r][1], '#C9A8FF', 1, 1 + i));
      dibujarMol3D(ctx, R, MOL.morfina, { cx: 1480, cy: 760, esc: 44, rotY: 0.9, rotX: 0.3, niebla: 0.4,
        brillos: [{ atomos: MOL.morfina ? MOL.morfina.grupos.amina : [], color: P.mu, a: 1, r: 4 }] });
      velo(ctx, 0, 1100, 0.7);
      txt(ctx, 'OPIOIDES', 90, 430, { family: F.display, size: 250, weight: 800, stretch: 'condensed', ls: -2 });
      txt(ctx, '¿cómo actúan en tu', 100, 550, { family: F.display, size: 96, weight: 700, color: P.accent });
      txt(ctx, 'sistema nervioso?', 100, 650, { family: F.display, size: 96, weight: 700, color: P.accent });
      [['μ', P.mu], ['δ', P.delta], ['κ', P.kappa]].forEach(([l, c], i) => {
        caja(ctx, 100 + i * 150, 730, 124, 124, 62, hexA(c, 0.16), c, 4);
        txt(ctx, l, 162 + i * 150, 818, { family: F.greek, italic: true, weight: 700, size: 78, color: c, align: 'center' });
      });
      caja(ctx, 100, 900, 700, 90, 45, hexA(P.accent, 0.16), P.accent, 3);
      txt(ctx, 'animación 3D · con aclaraciones', 450, 958, { family: F.mono, size: 34, weight: 600, color: P.ink, align: 'center' });
      grano();
    }

    return {
      dibujar, miniatura, W, H, duracion: TT, capitulos: D.capitulos,
      escenas: ESCENAS.map(e => ({ ini: Math.max(0, e.ini), fin: e.fin, cap: e.cap })),
      mol: MOL,
    };
  }

  global.Escenario3D = { cargar, crear, dibujarMol3D, prepararMol3D, secuencia, plano, W, H };
})(typeof window !== 'undefined' ? window : globalThis);
