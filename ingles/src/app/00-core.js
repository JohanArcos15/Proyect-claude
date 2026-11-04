/* ================= Utilidades ================= */
const DAY = 864e5, MIN = 6e4;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };
const dayIndex = (d = new Date()) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DOW_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]); }

/* Normaliza respuestas: minúsculas, sin puntuación y con contracciones expandidas. */
const CONTR = [[/\bcan't\b/g, 'cannot'], [/\bcan not\b/g, 'cannot'], [/\bwon't\b/g, 'will not'], [/\b(\w+)n't\b/g, '$1 not'], [/\bi'm\b/g, 'i am'], [/\b(\w+)'re\b/g, '$1 are'], [/\b(\w+)'ve\b/g, '$1 have'], [/\b(\w+)'ll\b/g, '$1 will'], [/\b(it|that|there|he|she|what|where|who|here)'s\b/g, '$1 is'], [/\b(i|you|we|they|he|she)'d\b/g, '$1 would']];
function norm(s, opts = {}) {
  let t = String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[“”«»"]/g, ' ').replace(/[.,!?;:¡¿()]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [re, r] of CONTR) t = t.replace(re, r);
  if (opts.numbers) t = t.replace(/\b\d+(\.\d+)?\b/g, m => numWords(Number(m)));
  if (opts.hyphens) t = t.replace(/-/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
/* tolerant: acepta un error de tipeo en palabras largas (solo vocabulario, nunca gramática). */
function checkAnswer(input, accepted, tolerant = false) {
  const t = norm(input); if (!t) return { ok: false, empty: true, best: accepted[0] };
  let best = Infinity, bestA = accepted[0];
  for (const a of accepted) { const d = lev(t, norm(a)); if (d < best) { best = d; bestA = a; } }
  if (best === 0) return { ok: true, best: bestA };
  if (tolerant && best === 1 && norm(bestA).length >= 5) return { ok: true, close: true, best: bestA };
  return { ok: false, best: bestA };
}
/* Diferencia palabra a palabra (LCS) entre lo esperado y lo dicho/escrito. */
function wdiff(target, said) {
  const T = norm(target, { numbers: true, hyphens: true }).split(' ').filter(Boolean);
  const Sd = norm(said, { numbers: true, hyphens: true }).split(' ').filter(Boolean);
  const m = T.length, n = Sd.length, L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = T[i] === Sd[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < m && j < n) { if (T[i] === Sd[j]) { out.push({ w: T[i], t: 'ok' }); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ w: T[i], t: 'miss' }); i++; } else { out.push({ w: Sd[j], t: 'extra' }); j++; } }
  while (i < m) out.push({ w: T[i++], t: 'miss' }); while (j < n) out.push({ w: Sd[j++], t: 'extra' });
  const ok = out.filter(x => x.t === 'ok').length;
  return { parts: out, score: m ? ok / m : 0, missed: out.filter(x => x.t === 'miss').map(x => x.w) };
}
function diffHTML(d) { return `<p class="diff">${d.parts.map(p => `<span class="${p.t}">${esc(p.w)}</span>`).join(' ')}</p>`; }

/* Números en palabras (inglés de EE. UU.) */
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function intWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + intWords(n % 100) : '');
  return intWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + intWords(n % 1000) : '');
}
function numWords(x) {
  if (!isFinite(x)) return String(x);
  const [i, d] = String(x).split('.');
  return intWords(Number(i)) + (d ? ' point ' + d.split('').map(c => ONES[Number(c)]).join(' ') : '');
}

/* ================= Estado y guardado ================= */
const LS_KEY = 'dosis-de-ingles:v1';
const LVL_MAX = { A1: 1, A2: 2, B1: 3, B2: 3 };
function freshState() {
  return {
    v: 1, updated: 0, created: dkey(), level: 'A2', onboarded: false,
    settings: { accent: 'us', rate: 0.9, newPerDay: 15, autoplay: true, roundMode: 'a2' },
    srs: {}, custom: [], days: {}, hvpt: {},
    drills: { stress: { n: 0, ok: 0 }, ed: { n: 0, ok: 0 }, s: { n: 0, ok: 0 }, dose: { n: 0, ok: 0 } },
    grammar: {}, listening: {}, reading: {}, speaking: { n: 0, log: [] }, writing: [],
    placement: null, intention: null, quiz: null
  };
}
function upgrade(s) {
  const base = freshState();
  if (!s || typeof s !== 'object') return base;
  const out = Object.assign(base, s);
  out.settings = Object.assign(freshState().settings, s.settings || {});
  out.drills = Object.assign(freshState().drills, s.drills || {});
  out.speaking = Object.assign({ n: 0, log: [] }, s.speaking || {});
  for (const k of ['srs', 'days', 'hvpt', 'grammar', 'listening', 'reading']) if (!out[k] || typeof out[k] !== 'object') out[k] = {};
  for (const k of ['custom', 'writing']) if (!Array.isArray(out[k])) out[k] = [];
  return out;
}
let hadLocal = false;
function lsLoad() { try { const raw = localStorage.getItem(LS_KEY); if (raw) { hadLocal = true; return JSON.parse(raw); } } catch (e) { /* sin almacenamiento */ } return null; }
function lsSave() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } }
let S = upgrade(lsLoad());

function today() {
  const k = dkey();
  if (!S.days[k]) S.days[k] = { sec: 0, steps: {}, rev: 0, ok: 0, newc: 0, prodc: 0, quick: 0, turns: 0 };
  return S.days[k];
}
function pruneDays() {
  const keys = Object.keys(S.days).sort();
  if (keys.length > 420) for (const k of keys.slice(0, keys.length - 400)) delete S.days[k];
  if (S.writing.length > 20) S.writing = S.writing.slice(-20);
  if (S.speaking.log.length > 40) S.speaking.log = S.speaking.log.slice(-40);
}

/* Nube: la base de datos privada del artefacto (data/users/<id>/progress). Sin ella, solo este navegador. */
const Cloud = { ref: null, writing: false, again: false, readonly: false, mode: 'local', hiddenAt: 0 };
let cloudTimer = null, dirty = false;
function commit() {
  S.updated = Date.now(); dirty = true; pruneDays(); lsSave();
  clearTimeout(cloudTimer); cloudTimer = setTimeout(flushCloud, 2500);
}
function setSync(mode) {
  Cloud.mode = mode;
  const txt = { cloud: 'Guardado en tu cuenta', local: 'Guardado en este navegador', connecting: 'Conectando…', err: 'Sin conexión: guardado aquí' }[mode] || '';
  const short = { cloud: 'En tu cuenta', local: 'En este navegador', connecting: 'Conectando…', err: 'Sin conexión' }[mode] || '';
  const cls = mode === 'cloud' ? 'cloud' : mode === 'err' ? 'err' : 'local';
  $$('[data-sync]').forEach(el => { el.className = 'sync ' + cls; el.innerHTML = `<i></i>${esc(el.dataset.sync === 'short' ? short : txt)}`; el.title = txt; });
}
async function initCloud() {
  if (!(window.claude && typeof window.claude.use === 'function')) { setSync('local'); return; }
  setSync('connecting');
  let db = null, user = null;
  try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch (e) { /* sin capacidad */ }
  if (!db || !user) { setSync('local'); return; }
  let uid = null; try { uid = await user.id(); } catch (e) { /* sin id */ }
  if (!uid) { setSync('local'); return; }
  try { Cloud.ref = db.doc('data/users/' + uid + '/progress'); } catch (e) { setSync('local'); return; }
  await pullCloud(true);
}
async function pullCloud(first) {
  if (!Cloud.ref || Cloud.writing) return;
  try {
    const snap = await withTimeout(Cloud.ref.get(), 10000);
    if (snap.exists) {
      const remote = JSON.parse(JSON.stringify(snap.data() || {}));
      if ((first && !hadLocal) || (remote.updated || 0) > (S.updated || 0)) { S = upgrade(remote); lsSave(); render(); }
      else if ((S.updated || 0) > (remote.updated || 0)) flushCloud();
    } else if ((S.updated || 0) > 0) flushCloud();
    if (!Cloud.readonly) setSync('cloud');
  } catch (e) { setSync('err'); }
}
async function flushCloud() {
  clearTimeout(cloudTimer);
  if (!Cloud.ref || Cloud.readonly) return;
  if (Cloud.writing) { Cloud.again = true; return; }
  Cloud.writing = true; dirty = false;
  try { await Cloud.ref.set(JSON.parse(JSON.stringify(S))); setSync('cloud'); }
  catch (e) {
    const c = e && e.code;
    if (['invalid_argument', 'not_granted', 'revoked', 'capability_disabled', 'capability_removed'].includes(c)) { Cloud.readonly = true; setSync('local'); }
    else if (c === 'quota_exceeded') { setSync('err'); toast('Tu espacio de guardado está lleno: el progreso queda en este navegador.'); }
    else { dirty = true; setSync('err'); }
  } finally {
    Cloud.writing = false;
    if (Cloud.again) { Cloud.again = false; cloudTimer = setTimeout(flushCloud, 1500); }
  }
}

/* Tiempo de estudio: cuenta mientras la página está visible y hubo actividad en los últimos 2 minutos. */
let lastAct = Date.now();
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
setInterval(() => {
  if (document.visibilityState === 'visible' && Date.now() - lastAct < 120000) {
    today().sec += 10; S.updated = Date.now(); dirty = true;
    const el = $('[data-dose-min]'); if (el) el.textContent = Math.floor(today().sec / 60);
  }
}, 10000);
setInterval(() => { if (dirty) lsSave(); }, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { Cloud.hiddenAt = Date.now(); lsSave(); if (dirty) flushCloud(); }
  else if (Cloud.ref && Date.now() - Cloud.hiddenAt > 20000 && !dirty) pullCloud(false);
});
addEventListener('pagehide', () => { lsSave(); if (dirty) flushCloud(); });

/* ================= Voz (síntesis del navegador) ================= */
const TTS = {
  ok: typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined',
  voices: [], token: 0,
  init() {
    if (!this.ok) return;
    const load = () => {
      try { this.voices = (speechSynthesis.getVoices() || []).filter(v => /^en([-_]|$)/i.test(v.lang)); } catch (e) { this.voices = []; }
      if (route() === 'progreso') render();
    };
    load();
    try { speechSynthesis.addEventListener('voiceschanged', load); } catch (e) { speechSynthesis.onvoiceschanged = load; }
  },
  list() {
    const acc = S.settings.accent; let l = this.voices;
    if (acc === 'us') l = l.filter(v => /en[-_]US/i.test(v.lang));
    if (acc === 'uk') l = l.filter(v => /en[-_]GB/i.test(v.lang));
    return l.length ? l : this.voices;
  },
  main() { const l = this.list(); return l.find(v => /Google|Samantha|Natural|Neural|Premium|Enhanced/i.test(v.name)) || l.find(v => v.default) || l[0] || null; },
  second() { const m = this.main(); return this.list().find(v => v !== m) || this.voices.find(v => v !== m) || m; },
  random() { return this.voices.length ? pick(this.voices) : null; },
  speak(text, o = {}) {
    return new Promise(res => {
      if (!this.ok || !text) { res(false); return; }
      lastAct = Date.now();
      const u = new SpeechSynthesisUtterance(text);
      const v = o.voice === undefined ? this.main() : o.voice;
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = o.rate || S.settings.rate; u.pitch = o.pitch || 1;
      let done = false; const fin = ok => { if (done) return; done = true; clearTimeout(t); res(ok); };
      u.onend = () => fin(true); u.onerror = () => fin(false);
      const t = setTimeout(() => fin(true), 2500 + text.split(/\s+/).length * 650 / u.rate);
      try { if (!o.queue) speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { fin(false); }
    });
  },
  stop() { this.token++; if (this.ok) try { speechSynthesis.cancel(); } catch (e) { /* nada */ } }
};
const estSec = text => 0.6 + text.split(/\s+/).length * 0.42 / S.settings.rate;
let actx = null;
function chime() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.75);
  } catch (e) { /* sin audio */ }
}

/* ================= Tutor con IA (capacidad «sample») ================= */
const AI = {
  fn: null, off: false,
  async init() {
    if (!(window.claude && typeof window.claude.use === 'function')) return;
    try { this.fn = await window.claude.use('sample'); } catch (e) { this.fn = null; }
    if (this.fn && ['habla', 'escritura', 'gramatica', 'hoy'].includes(route())) render();
  },
  ok() { return !!this.fn && !this.off; },
  fail(e) {
    const c = e && e.code;
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(c)) this.off = true;
    return aiMsg(c);
  }
};
function aiMsg(code) {
  return ({
    rate_limited: 'Demasiadas consultas seguidas o llegaste a tu límite de uso. Intenta de nuevo en un rato.',
    session_expired: 'Tu sesión de Claude expiró: vuelve a iniciar sesión.',
    refused: 'El tutor no pudo responder a ese texto. Cámbialo un poco e intenta de nuevo.',
    invalid_json: 'La respuesta llegó incompleta. Pulsa de nuevo para reintentar.',
    not_granted: 'No se dio permiso para usar Claude en esta página. Las funciones con IA quedan ocultas en esta visita.',
    sampling_disabled: 'Claude no está disponible para esta cuenta.',
    empty_completion: 'El tutor no devolvió texto. Prueba con un texto más corto.',
    prompt_too_large: 'El texto es demasiado largo. Envía una parte más corta.',
    upstream_error: 'Falló la conexión con el tutor. Intenta de nuevo.',
    cancelled: 'Consulta detenida.'
  })[code] || 'No se pudo completar la consulta. Intenta de nuevo.';
}
const IN_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');
const learner = () => `Learner: a Spanish-speaking (Latin America) university student of pharmaceutical chemistry. Current English level: about ${S.level} (CEFR). Goals: an English certificate, speaking fluently, reading scientific papers and working in pharmacy or the pharmaceutical industry.`;
const AI_OFF_NOTE = () => IN_CLAUDE
  ? `<p class="note small">Las funciones con IA usan tu cuenta de Claude. ${AI.off ? 'En esta visita no hay permiso; recarga la página para volver a preguntar.' : 'Se activan al abrir la app dentro de Claude.'}</p>`
  : `<p class="note small">El tutor con IA solo funciona cuando abres la app desde Claude (claude.ai). Aquí puedes usar la lista de autorrevisión.</p>`;

/* Pregunta libre al tutor (respuesta en streaming) */
const TUTOR = {};
function tutorBox(key, ctx) {
  if (!AI.ok()) return '';
  const st = TUTOR[key] || {};
  return `<div class="card stack">
    <div class="row-between"><h3>Pregúntale al tutor</h3><span class="chip pine">${ICON.spark} IA</span></div>
    <p class="small muted">¿Algo no te quedó claro? Pregunta en español; responde con ejemplos.</p>
    <textarea id="tutor-${esc(key)}" class="textarea" style="min-height:80px" placeholder="Ej.: ¿Por qué se dice «It is important» y no «Is important»?">${esc(st.q || '')}</textarea>
    <div class="row"><button class="btn btn-primary btn-sm" data-act="askTutor" data-key="${esc(key)}" data-ctx="${esc(ctx)}" ${st.busy ? 'disabled' : ''}>Preguntar</button>${st.busy ? '<button class="btn btn-sm" data-act="stopTutor" data-key="' + esc(key) + '">Detener</button>' : ''}</div>
    <div id="tutor-out-${esc(key)}" class="prose small" style="white-space:pre-wrap">${st.busy && !st.a ? '<span class="thinking"><i></i><i></i><i></i></span>' : esc(st.a || '')}</div>
  </div>`;
}

/* ================= Iconos ================= */
const sv = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
const ICON = {
  hoy: sv('<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="M8 15l2.5 2.5L16 13"/>'),
  repaso: sv('<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 3h10a3 3 0 0 1 3 3v11"/>'),
  practicar: sv('<path d="M9 3h6M10 3v6l-5.6 9.4A2 2 0 0 0 6.1 21.5h11.8a2 2 0 0 0 1.7-3.1L14 9V3"/><path d="M7 15h10"/>'),
  progreso: sv('<path d="M3 21h18"/><path d="M6 17v-5M11 17V7M16 17v-8M21 17V4"/>'),
  ciencia: sv('<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>'),
  sonidos: sv('<path d="M3 12h2M7 8v8M11 4v16M15 8v8M19 10v4"/>'),
  escucha: sv('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>'),
  gramatica: sv('<path d="M8 4H5v16h3M16 4h3v16h-3M9 12h6"/>'),
  habla: sv('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>'),
  escritura: sv('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  lectura: sv('<path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>'),
  play: sv('<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>'),
  stop: sv('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>'),
  mic: sv('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>'),
  back: sv('<path d="M15 18l-6-6 6-6"/>'),
  next: sv('<path d="M9 18l6-6-6-6"/>'),
  check: sv('<path d="M20 6L9 17l-5-5"/>'),
  spark: sv('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', 'style="width:14px;height:14px"'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  rec: sv('<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>')
};
const LOGO = `<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(-40 16 16)"><rect x="4" y="11" width="24" height="10" rx="5" fill="var(--amber-fill)"/><path d="M16 11h7a5 5 0 0 1 0 10h-7z" fill="var(--pine)"/></g></svg>`;
const playBtn = (text, extra = '', label = 'Escuchar') => `<button class="icon-btn sm" data-act="say" data-text="${esc(text)}" ${extra} aria-label="${esc(label)}" title="${esc(label)}">${ICON.play}</button>`;

/* ================= Navegación ================= */
const NAV = [
  ['hoy', 'Hoy'], ['repaso', 'Repaso'], ['practicar', 'Practicar'], ['progreso', 'Progreso'], ['ciencia', 'Ciencia']
];
const PRACTICE = [
  ['sonidos', 'Sonidos', 'Pares mínimos con muchas voces, acento de palabra y terminaciones.'],
  ['escucha', 'Escucha', 'Diálogos de farmacia y laboratorio, dictado, shadowing y dosis.'],
  ['gramatica', 'Gramática', 'Unidades cortas con el error típico del hispanohablante.'],
  ['habla', 'Habla', 'Preguntas rápidas, técnica 4/3/2, conversación con IA y lectura en voz alta.'],
  ['escritura', 'Escritura', 'Correos, instrucciones a pacientes, resúmenes y opinión, con corrección.'],
  ['lectura', 'Lectura', 'Textos graduados: paracetamol, antibióticos, ADME, abstracts.']
];
const ROUTES = ['hoy', 'repaso', 'mazo', 'practicar', 'sonidos', 'escucha', 'gramatica', 'habla', 'escritura', 'lectura', 'progreso', 'ciencia', 'nivel'];
const PARENT = { mazo: 'repaso', sonidos: 'practicar', escucha: 'practicar', gramatica: 'practicar', habla: 'practicar', escritura: 'practicar', lectura: 'practicar', nivel: 'progreso' };
const VIEWS = {}, ACT = {}, INP = {}, CHG = {};
const UI = {};
let POST = [];
const after = fn => POST.push(fn);
const TIMERS = new Set();
function every(ms, fn) { const id = setInterval(fn, ms); TIMERS.add(id); return id; }
function stopTimers() { TIMERS.forEach(id => clearInterval(id)); TIMERS.clear(); }
function route() { const h = (location.hash || '').replace('#', ''); return ROUTES.includes(h) ? h : 'hoy'; }
function go(name, sub) {
  if (sub !== undefined) UI[name] = sub;
  if (route() === name) { TTS.stop(); stopTimers(); render(); window.scrollTo(0, 0); }
  else location.hash = name;
}
function render() {
  const r = route(); POST = [];
  let html = '';
  try { html = VIEWS[r](); } catch (e) { console.error(e); html = `<div class="card"><h2>Algo falló en esta sección</h2><p class="muted">${esc(e.message)}</p><button class="btn" data-act="goHome">Volver a Hoy</button></div>`; }
  $('#view').innerHTML = sessionBar(r) + html;
  const active = PARENT[r] || r;
  $$('[data-navlink]').forEach(a => { if (a.dataset.navlink === active || a.dataset.navlink === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  setSync(Cloud.mode);
  const fns = POST; POST = []; fns.forEach(f => { try { f(); } catch (e) { console.error(e); } });
}
let toastT = null;
function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

/* Dictado: en Claude el micrófono de la página está bloqueado, así que se usa el del teclado. */
const SRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const CAN_SR = !!SRec && !IN_CLAUDE;
const DICT_HINT = 'Toca el cuadro y usa el micrófono de tu teclado con el idioma en inglés (Gboard: mantén pulsado el micrófono › Idiomas; iPhone: cambia al teclado en inglés).';
function dictField(id, placeholder, value = '') {
  return `<div class="field">
    <textarea id="${id}" class="textarea" placeholder="${esc(placeholder)}" data-input="keep">${esc(value)}</textarea>
    <div class="row">${CAN_SR ? `<button class="btn btn-sm" data-act="dictate" data-target="${id}">${ICON.mic} Dictar</button>` : ''}<span class="small faint grow">${esc(CAN_SR ? 'O usa el micrófono de tu teclado en inglés.' : DICT_HINT)}</span></div>
  </div>`;
}
const KEEP = {};
INP.keep = el => { KEEP[el.id] = el.value; };
const kept = id => KEEP[id] || '';
function recorder(id) {
  return `<div class="row"><label class="btn btn-sm">${ICON.rec} Grabarme<input type="file" accept="audio/*" capture class="sr" data-change="recfile" data-target="${id}"></label><audio id="${id}" controls hidden style="max-width:100%"></audio></div>`;
}
CHG.recfile = el => { const f = el.files && el.files[0]; const a = document.getElementById(el.dataset.target); if (f && a) { a.src = URL.createObjectURL(f); a.hidden = false; } };
ACT.dictate = el => {
  const ta = document.getElementById(el.dataset.target); if (!ta || !SRec) return;
  try {
    const r = new SRec(); r.lang = S.settings.accent === 'uk' ? 'en-GB' : 'en-US'; r.interimResults = true; r.continuous = true;
    const base = ta.value ? ta.value.trim() + ' ' : '';
    el.innerHTML = `${ICON.rec} Escuchando… toca para parar`;
    el.dataset.act = 'stopDictate'; el._rec = r;
    r.onresult = ev => { let txt = ''; for (const res of ev.results) txt += res[0].transcript; ta.value = base + txt; KEEP[ta.id] = ta.value; };
    r.onerror = ev => { toast(ev.error === 'not-allowed' ? 'El micrófono está bloqueado: usa el dictado de tu teclado.' : 'No se pudo usar el micrófono.'); };
    r.onend = () => { el.dataset.act = 'dictate'; el.innerHTML = `${ICON.mic} Dictar`; };
    r.start();
  } catch (e) { toast('No se pudo usar el micrófono: usa el dictado de tu teclado.'); }
};
ACT.stopDictate = el => { try { el._rec && el._rec.stop(); } catch (e) { /* nada */ } };
ACT.say = el => { TTS.speak(el.dataset.text, el.dataset.voice === 'random' ? { voice: TTS.random() } : {}); };
ACT.goHome = () => go('hoy', null);
ACT.nav = (el, ev) => { const to = el.dataset.navlink; UI[to] = null; if (el.tagName !== 'A' || route() === to) { ev.preventDefault(); go(to); } };
ACT.goto = el => go(el.dataset.to);
