/* ================= Repetición espaciada ================= */
const ITEMS = [], ITEM = {};
VOCAB.forEach((g, gi) => g.items.forEach((it, ii) => {
  const [lvl, en, es, ex, exEs, tip, ipa] = it;
  let id = slug(en); while (ITEM[id]) id += '-b';
  const o = { id, lvl, en, es, ex: ex || '', exEs: exEs || '', tip: tip || '', ipa: ipa || '', tag: g.tag, tagLabel: g.label, order: lvl * 10000 + ii * 10 + gi };
  ITEMS.push(o); ITEM[id] = o;
}));
function itemById(id) { return ITEM[id] || S.custom.find(c => c.id === id) || null; }
function allItems() { return S.custom.map(c => Object.assign({ tag: 'propia', tagLabel: 'Tuya', lvl: 0, order: -1, tip: '', ipa: '', ex: '', exEs: '' }, c)).concat(ITEMS); }
const cardItem = cid => itemById(cid.replace(/:[rp]$/, ''));
const isLearning = c => c.s === 'learn' || c.s === 'relearn';

function newPool() { const max = LVL_MAX[S.level] || 2; return allItems().filter(it => it.lvl <= max && !S.srs[it.id + ':r']).sort((a, b) => a.order - b.order); }
function prodPool() { return allItems().filter(it => { const r = S.srs[it.id + ':r']; return r && r.s === 'review' && r.ivl >= 3 && !S.srs[it.id + ':p']; }); }
function srsCounts() {
  const now = Date.now(), eod = endOfToday(); let due = 0, learn = 0;
  for (const [id, c] of Object.entries(S.srs)) {
    if (!cardItem(id)) continue;
    if (isLearning(c)) { if (c.due <= now + 20 * MIN) learn++; } else if (c.due <= eod) due++;
  }
  const t = today();
  const newAvail = Math.min(Math.max(0, S.settings.newPerDay - t.newc), newPool().length);
  const prodAvail = Math.min(Math.max(0, 10 - t.prodc), prodPool().length);
  return { due, learn, newAvail, prodAvail, total: due + learn + newAvail + prodAvail };
}
function nextCard() {
  const now = Date.now(), eod = endOfToday(), t = today();
  let best = null;
  for (const [id, c] of Object.entries(S.srs)) if (isLearning(c) && c.due <= now && cardItem(id) && (!best || c.due < best[1].due)) best = [id, c];
  if (best) return best[0];
  const reviews = Object.entries(S.srs).filter(([id, c]) => !isLearning(c) && c.due <= eod && cardItem(id)).sort((a, b) => a[1].due - b[1].due);
  const newOk = t.newc < S.settings.newPerDay, prodOk = t.prodc < 10;
  const n = (UI.repaso && UI.repaso.count) || 0;
  if (reviews.length && !(n % 4 === 3 && (newOk || prodOk))) return reviews[0][0];
  if (prodOk && n % 2 === 0) { const p = prodPool()[0]; if (p) return p.id + ':p'; }
  if (newOk) { const it = newPool()[0]; if (it) return it.id + ':r'; }
  if (prodOk) { const p = prodPool()[0]; if (p) return p.id + ':p'; }
  if (reviews.length) return reviews[0][0];
  for (const [id, c] of Object.entries(S.srs)) if (isLearning(c) && c.due <= now + 20 * MIN && cardItem(id) && (!best || c.due < best[1].due)) best = [id, c];
  return best ? best[0] : null;
}
/* SM-2 modificado: pasos de aprendizaje de 1 y 10 min; facilidad entre 1,3 y ~3; intervalos con pequeña variación. */
function schedule(prev, grade, now = Date.now()) {
  const c = prev ? Object.assign({}, prev) : { s: 'new', step: 0, ivl: 0, ease: 2.5, reps: 0, lapses: 0 };
  const fuzz = d => d < 3 ? d : Math.round(d * (0.95 + Math.random() * 0.1));
  if (c.s === 'new' || isLearning(c)) {
    const steps = c.s === 'relearn' ? [10] : [1, 10];
    if (c.s === 'new') c.s = 'learn';
    if (grade === 1) { c.step = 0; c.due = now + steps[0] * MIN; }
    else if (grade === 2) { c.due = now + Math.round((steps[c.step] || steps[0]) * 1.5) * MIN; }
    else if (grade === 3) {
      c.step++;
      if (c.step >= steps.length) { c.ivl = c.s === 'relearn' ? Math.max(1, c.ivl) : 1; c.s = 'review'; c.step = 0; c.due = now + c.ivl * DAY; }
      else c.due = now + steps[c.step] * MIN;
    } else { c.ivl = c.s === 'relearn' ? Math.max(2, Math.round(c.ivl * 1.5)) : 4; c.s = 'review'; c.step = 0; c.due = now + c.ivl * DAY; }
  } else {
    const late = Math.max(0, (now - c.due) / DAY);
    if (grade === 1) { c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.ivl = Math.max(1, Math.round(c.ivl * 0.5)); c.s = 'relearn'; c.step = 0; c.due = now + 10 * MIN; }
    else {
      if (grade === 2) { c.ease = Math.max(1.3, c.ease - 0.15); c.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * 1.2)); }
      else if (grade === 3) c.ivl = Math.max(c.ivl + 1, Math.round((c.ivl + late / 2) * c.ease));
      else { c.ease = Math.min(3.2, c.ease + 0.15); c.ivl = Math.max(c.ivl + 2, Math.round((c.ivl + late) * c.ease * 1.3)); }
      c.ivl = Math.min(fuzz(c.ivl), 365); c.due = now + c.ivl * DAY;
    }
  }
  c.reps++; c.last = now;
  return c;
}
function fmtIvl(c, now = Date.now()) {
  const ms = c.due - now;
  if (ms < 60 * MIN) return `${Math.max(1, Math.round(ms / MIN))} min`;
  const d = Math.round(ms / DAY);
  if (d < 1) return `${Math.round(ms / (60 * MIN))} h`;
  if (d < 30) return `${d} d`;
  if (d < 365) return `${(d / 30).toFixed(d < 60 ? 1 : 0).replace('.', ',')} mes`;
  return '1 año';
}
function variants(en) {
  const out = new Set();
  const a = en.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim(), b = en.replace(/[()]/g, '').trim();
  for (const v of [en, a, b]) { out.add(v); out.add(v.replace(/^to /i, '')); }
  return [...out];
}
const typable = it => !/…/.test(it.en) && it.en.length <= 40;

VIEWS.repaso = () => {
  const st = UI.repaso || (UI.repaso = { mode: 'home' });
  const c = srsCounts();
  if (st.mode === 'study') return studyView(st);
  const max = LVL_MAX[S.level] || 2;
  const all = allItems().filter(i => i.lvl <= max);
  const seen = all.filter(i => S.srs[i.id + ':r']).length;
  const mature = Object.values(S.srs).filter(x => x.s === 'review' && x.ivl >= 21).length;
  return `<section class="head" style="margin-bottom:18px"><p class="mono eyebrow">Memoria a largo plazo</p><h1>Repaso espaciado</h1>
    <p class="lede">Ves cada palabra justo antes de olvidarla. Si la respondes bien, vuelve más tarde; si no, vuelve pronto.</p></section>
    <div class="card lift stack-lg">
      <div class="counts">
        <div class="kv"><span class="small muted">Pendientes</span><b class="tnum">${c.due + c.learn}</b></div>
        <div class="kv"><span class="small muted">Nuevas hoy</span><b class="tnum">${c.newAvail}</b></div>
        <div class="kv"><span class="small muted">Para producir</span><b class="tnum">${c.prodAvail}</b></div>
        <div class="kv"><span class="small muted">Maduras (≥21 d)</span><b class="tnum">${mature}</b></div>
      </div>
      <div class="stack" style="gap:6px"><div class="row-between small"><span class="muted">Vistas en tu nivel</span><span class="tnum">${seen} / ${all.length}</span></div><div class="bar"><i style="width:${pct(seen, all.length)}%"></i></div></div>
      <div class="row"><button class="btn btn-primary btn-lg" data-act="startStudy" ${c.total ? '' : 'disabled'}>${c.total ? 'Empezar repaso' : 'Todo al día'}</button><a class="btn" href="#mazo" data-act="nav" data-navlink="mazo">Ver mazo y añadir palabras</a></div>
      ${c.total ? '' : '<p class="small muted">No hay tarjetas pendientes. Mañana habrá nuevas y volverán las que toque repasar. Si quieres más hoy, sube el límite de nuevas en Progreso › Ajustes.</p>'}
    </div>
    <div class="note" style="margin-top:18px"><b>Cómo calificar:</b> «Otra vez» si no la recordaste; «Difícil» si te costó mucho; «Bien» si la recordaste; «Fácil» si fue inmediato. Sé honesto/a: el algoritmo solo funciona con datos reales.</div>`;
};
function studyView(st) {
  if (!st.card) st.card = nextCard();
  if (!st.card) {
    autoStep('repaso');
    return `<div class="card lift stack" style="text-align:center;align-items:center;padding:34px 20px">
      <h2>Repaso completo</h2><p class="muted">${plural(st.count || 0, 'tarjeta', 'tarjetas')} en esta sesión · ${pct(st.ok || 0, st.count || 0)}% recordadas.</p>
      <p class="small faint">Volver mañana es lo que convierte esto en memoria a largo plazo.</p>
      <div class="row" style="justify-content:center"><button class="btn btn-primary" data-act="goHome">Volver al plan</button><button class="btn" data-act="repasoHome">Ver resumen del mazo</button></div></div>`;
  }
  const cid = st.card, it = cardItem(cid), prev = S.srs[cid], prod = cid.endsWith(':p');
  const c = srsCounts();
  const tag = `<span class="chip ${it.tag === 'falso' ? 'bad' : it.tag === 'propia' ? 'amber' : 'pine'} flash-tag">${esc(it.tagLabel)}${prev ? '' : ' · nueva'}${prod ? ' · producir' : ''}</span>`;
  let front;
  if (!prod) {
    front = `<p class="mono faint">Inglés → español</p>
      <div class="row" style="gap:12px"><span class="term" lang="en">${esc(it.en)}</span>${playBtn(it.en)}</div>
      ${it.ipa ? `<p class="ipa muted">${esc(it.ipa)}</p>` : ''}
      ${st.flipped ? '' : '<p class="small muted">Dilo en voz alta y piensa qué significa. Luego muestra la respuesta.</p>'}`;
  } else {
    front = `<p class="mono faint">Español → inglés</p><span class="term">${esc(it.es)}</span>
      ${typable(it) && !st.flipped ? `<div class="row"><input id="prod-in" class="input grow" style="max-width:420px" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en" placeholder="Escríbelo en inglés"><button class="btn btn-primary" data-act="checkProd">Comprobar</button></div>` : ''}
      ${!typable(it) && !st.flipped ? '<p class="small muted">Dilo en voz alta en inglés y luego muestra la respuesta.</p>' : ''}`;
  }
  let back = '';
  if (st.flipped) {
    const r = st.result;
    back = `<hr class="hr">
      ${r ? `<p class="feedback ${r.ok ? (r.close ? 'warn' : 'ok') : 'no'}">${r.ok ? (r.close ? 'Casi: revisa la ortografía.' : 'Correcto.') : (r.empty ? 'Esta es la respuesta:' : 'No exactamente. La respuesta:')} <b lang="en">${esc(it.en)}</b></p>` : ''}
      ${prod ? `<div class="row" style="gap:12px"><span class="meaning" lang="en">${esc(it.en)}</span>${playBtn(it.en)}</div>${it.ipa ? `<p class="ipa muted">${esc(it.ipa)}</p>` : ''}` : `<p class="meaning">${esc(it.es)}</p>`}
      ${it.ex ? `<div class="row" style="align-items:flex-start;flex-wrap:nowrap">${playBtn(it.ex)}<p class="ex grow"><span lang="en">${esc(it.ex)}</span><br><em>${esc(it.exEs)}</em></p></div>` : ''}
      ${it.tip ? `<p class="note small">${esc(it.tip)}</p>` : ''}`;
  }
  const grades = st.flipped ? [1, 2, 3, 4].map(g => schedule(prev, g)) : null;
  return `<div class="row-between" style="margin-bottom:12px"><button class="back" data-act="repasoHome">${ICON.back} Salir</button><span class="small muted tnum">Quedan ~${c.total} · hechas ${st.count || 0}</span></div>
    <article class="flash">${tag}${front}${back}</article>
    <div style="margin-top:14px">${st.flipped
      ? `<div class="rate">${['Otra vez', 'Difícil', 'Bien', 'Fácil'].map((l, i) => `<button class="r${i + 1}" data-act="rate" data-g="${i + 1}">${l}<small>${fmtIvl(grades[i])}</small></button>`).join('')}</div><p class="small faint" style="margin-top:8px">Atajos: 1 · 2 · 3 · 4</p>`
      : `<button class="btn btn-primary btn-lg btn-block" data-act="flip">Mostrar respuesta</button><p class="small faint" style="margin-top:8px">Atajo: barra espaciadora</p>`}</div>`;
}
ACT.startStudy = () => { UI.repaso = { mode: 'study', count: 0, ok: 0 }; render(); afterCardShown(); };
ACT.repasoHome = () => { UI.repaso = { mode: 'home' }; render(); };
ACT.flip = () => { const st = UI.repaso; st.flipped = true; render(); if (st.card.endsWith(':p') && S.settings.autoplay) TTS.speak(cardItem(st.card).en); };
ACT.checkProd = () => {
  const st = UI.repaso, it = cardItem(st.card), v = ($('#prod-in') || {}).value || '';
  st.result = checkAnswer(v, variants(it.en), true); st.flipped = true; render();
  if (S.settings.autoplay) TTS.speak(it.en);
};
ACT.rate = el => {
  const st = UI.repaso, g = Number(el.dataset.g), cid = st.card, prev = S.srs[cid], t = today();
  if (!prev) { if (cid.endsWith(':r')) t.newc++; else t.prodc++; }
  S.srs[cid] = schedule(prev, g);
  t.rev++; if (g >= 3) t.ok++;
  st.count = (st.count || 0) + 1; if (g >= 3) st.ok = (st.ok || 0) + 1;
  commit();
  st.card = null; st.flipped = false; st.result = null;
  render(); afterCardShown();
};
function afterCardShown() {
  const st = UI.repaso; if (!st || !st.card) return;
  if (st.card.endsWith(':r') && S.settings.autoplay) TTS.speak(cardItem(st.card).en);
  const inp = $('#prod-in'); if (inp && matchMedia('(pointer:fine)').matches) inp.focus();
}
addEventListener('keydown', ev => {
  if (route() !== 'repaso' || !UI.repaso || UI.repaso.mode !== 'study' || !UI.repaso.card) return;
  if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) { if (ev.key === 'Enter' && ev.target.id === 'prod-in') { ev.preventDefault(); ACT.checkProd(); } return; }
  if (!UI.repaso.flipped && (ev.key === ' ' || ev.key === 'Enter')) { ev.preventDefault(); ACT.flip(); }
  else if (UI.repaso.flipped && /^[1-4]$/.test(ev.key)) { ev.preventDefault(); ACT.rate({ dataset: { g: ev.key } }); }
});

/* Mazo: explorar y añadir palabras propias */
VIEWS.mazo = () => {
  const st = UI.mazo || (UI.mazo = { tag: 'todas', q: '' });
  const tags = [['todas', 'Todas'], ['propia', 'Tuyas']].concat(VOCAB.map(g => [g.tag, g.label]));
  const q = norm(st.q);
  const list = allItems().filter(i => (st.tag === 'todas' || i.tag === st.tag) && (!q || norm(i.en + ' ' + i.es).includes(q)));
  const status = it => { const r = S.srs[it.id + ':r']; if (!r) return '<span class="chip">Nueva</span>'; if (isLearning(r)) return '<span class="chip amber">Aprendiendo</span>'; return r.ivl >= 21 ? '<span class="chip good">Madura</span>' : '<span class="chip pine">En repaso</span>'; };
  return `<button class="back" data-act="goto" data-to="repaso">${ICON.back} Repaso</button>
    <section class="head" style="margin:10px 0 18px"><h1>Mazo de vocabulario</h1><p class="lede">${ITEMS.length} entradas seleccionadas por frecuencia y utilidad para tu carrera, más las tuyas.</p></section>
    <details class="card stack" ${st.adding ? 'open' : ''}><summary style="cursor:pointer;font-weight:700">Añadir una palabra propia</summary>
      <div class="grid-2" style="margin-top:12px"><div class="field"><label for="add-en">Inglés</label><input id="add-en" class="input" lang="en" placeholder="Ej.: dropper"></div><div class="field"><label for="add-es">Español</label><input id="add-es" class="input" placeholder="Ej.: gotero"></div></div>
      <div class="field"><label for="add-ex">Ejemplo en inglés (opcional)</label><input id="add-ex" class="input" lang="en" placeholder="Ej.: Use the dropper to add two drops."></div>
      <div class="row"><button class="btn btn-primary" data-act="addCard">${ICON.plus} Añadir al repaso</button></div></details>
    <div class="row" style="margin:16px 0 10px">${tags.map(([k, l]) => `<button class="chip" aria-pressed="${st.tag === k}" data-act="mazoTag" data-tag="${k}">${esc(l)}</button>`).join('')}</div>
    <input id="mazo-q" class="input" placeholder="Buscar en inglés o español" value="${esc(st.q)}" data-input="mazoQ" style="margin-bottom:12px">
    <div class="list" id="mazo-list">${list.length ? list.slice(0, 300).map(it => `<div class="row" style="flex-wrap:nowrap">${playBtn(it.en)}<div class="grow"><b lang="en">${esc(it.en)}</b><div class="small muted">${esc(it.es)}</div></div>${status(it)}</div>`).join('') : '<div class="empty">Sin resultados.</div>'}</div>`;
};
ACT.mazoTag = el => { UI.mazo.tag = el.dataset.tag; render(); };
INP.mazoQ = el => { UI.mazo.q = el.value; clearTimeout(INP._mq); INP._mq = setTimeout(() => { const pos = el.selectionStart; render(); const n = $('#mazo-q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } }, 250); };
ACT.addCard = () => {
  const en = ($('#add-en').value || '').trim(), es = ($('#add-es').value || '').trim(), ex = ($('#add-ex').value || '').trim();
  if (!en || !es) { toast('Escribe la palabra en inglés y en español.'); return; }
  addCustom(en, es, ex); UI.mazo.adding = true; render(); toast('Añadida: aparecerá en tu próximo repaso.');
};
function addCustom(en, es, ex = '', exEs = '') {
  const exists = allItems().some(i => norm(i.en) === norm(en));
  if (exists) return false;
  S.custom.push({ id: 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), en: en.slice(0, 80), es: es.slice(0, 120), ex: ex.slice(0, 200), exEs: exEs.slice(0, 200) });
  commit(); return true;
}
