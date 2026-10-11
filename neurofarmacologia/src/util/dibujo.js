// Primitivas de dibujo 2D compartidas por los lienzos (sinapsis, gráficas).

export const FUENTE = {
  texto: '"Atkinson Hyperlegible", "Texto", system-ui, sans-serif',
  titulo: '"Bricolage Grotesque", "Atkinson Hyperlegible", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

export const TINTA = {
  fondo: '#070b13',
  panel: '#0d1420',
  linea: '#22304a',
  texto: '#e6ecf5',
  suave: '#93a1b8',
  tenue: '#5b6880',
  membrana: '#c9b8e8',
  cola: 'rgba(201,184,232,0.18)',
  citoplasma: 'rgba(110,130,170,0.08)',
};

export function rgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function mezcla(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const c = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
}

export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (!(w > 0 && h > 0)) return;
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function brillo(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, 0.55 * a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function circulo(ctx, x, y, r, relleno, borde, ancho = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = ancho; ctx.stroke(); }
}

export function hexagono(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = rot + (Math.PI / 3) * i + Math.PI / 6;
    const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

// Polilínea muestreada → puntos equiespaciados con normal
export function muestrear(puntos, paso) {
  const salida = [];
  let resto = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const [x0, y0] = puntos[i], [x1, y1] = puntos[i + 1];
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
    if (!L) continue;
    const nx = -dy / L, ny = dx / L;
    let d = resto;
    while (d <= L) {
      salida.push({ x: x0 + (dx * d) / L, y: y0 + (dy * d) / L, nx, ny });
      d += paso;
    }
    resto = d - L;
  }
  return salida;
}

// Curva cuadrática/cúbica → polilínea
export function bezier(p0, p1, p2, p3, n = 24) {
  const r = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    r.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return r;
}

// Bicapa lipídica a lo largo de una polilínea. huecos: [[xIni, xFin]] donde
// hay proteínas y no se dibujan fosfolípidos.
export function bicapa(ctx, puntos, { grosor = 16, color = TINTA.membrana, huecos = [], paso = 5.2, alfa = 1 } = {}) {
  const m = muestrear(puntos, paso);
  const enHueco = (p) => huecos.some(([a, b]) => p.x > a && p.x < b);
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.strokeStyle = TINTA.cola;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const p of m) {
    if (enHueco(p)) continue;
    const h = grosor / 2 - 2.6;
    ctx.moveTo(p.x + p.nx * h, p.y + p.ny * h);
    ctx.lineTo(p.x + p.nx * 1.2, p.y + p.ny * 1.2);
    ctx.moveTo(p.x - p.nx * h, p.y - p.ny * h);
    ctx.lineTo(p.x - p.nx * 1.2, p.y - p.ny * 1.2);
  }
  ctx.stroke();
  ctx.fillStyle = color;
  for (const p of m) {
    if (enHueco(p)) continue;
    const h = grosor / 2;
    ctx.beginPath();
    ctx.arc(p.x + p.nx * h, p.y + p.ny * h, 2.25, 0, Math.PI * 2);
    ctx.arc(p.x - p.nx * h, p.y - p.ny * h, 2.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Factor global de tamaño de texto (las escenas escaladas lo suben para que se lean)
let ESCALA_TEXTO = 1;
export function escalaTexto(s) { ESCALA_TEXTO = s; }

export function rotulo(ctx, texto, x, y, { color = TINTA.suave, tam = 11, alinear = 'center', peso = 400, fuente = FUENTE.texto, base = 'middle' } = {}) {
  ctx.font = `${peso} ${tam * ESCALA_TEXTO}px ${fuente}`;
  ctx.fillStyle = color;
  ctx.textAlign = alinear;
  ctx.textBaseline = base;
  ctx.fillText(texto, x, y);
}

// Rótulo con fondo tipo «píldora»
export function pildora(ctx, texto, x, y, { color = TINTA.texto, fondo = 'rgba(13,20,32,0.88)', borde = TINTA.linea, tam = 11, peso = 600, alinear = 'center' } = {}) {
  tam *= ESCALA_TEXTO;
  ctx.font = `${peso} ${tam}px ${FUENTE.texto}`;
  const w = ctx.measureText(texto).width + 12, h = tam + 8;
  const x0 = alinear === 'center' ? x - w / 2 : alinear === 'left' ? x : x - w;
  rrect(ctx, x0, y - h / 2, w, h, h / 2);
  ctx.fillStyle = fondo;
  ctx.fill();
  ctx.strokeStyle = borde;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, x0 + w / 2, y + 0.5);
  return { x: x0, y: y - h / 2, w, h };
}

export function flecha(ctx, x0, y0, x1, y1, color, ancho = 1.5, punta = 6) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = ancho;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 - Math.cos(a) * punta * 0.6, y1 - Math.sin(a) * punta * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a - 0.45) * punta, y1 - Math.sin(a - 0.45) * punta);
  ctx.lineTo(x1 - Math.cos(a + 0.45) * punta, y1 - Math.sin(a + 0.45) * punta);
  ctx.closePath();
  ctx.fill();
}

// Ajusta un canvas al tamaño CSS con densidad de píxeles
export function ajustarLienzo(canvas, ancho, alto) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(ancho * dpr)), h = Math.max(1, Math.round(alto * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return dpr;
}

export function aleatorio(semilla = 1) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(rnd) {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
