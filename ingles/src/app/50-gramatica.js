/* ================= Gramática ================= */
const G_INT = [1, 3, 7, 16, 35, 70];
function startUnit(id, mode) {
  const u = GRAMMAR.find(x => x.id === id);
  if (mode === 'review') return { id, mode, phase: 'practice', queue: shuffle(u.ex.map((_, i) => i)), i: 0, res: [], cur: null };
  return { id, mode: 'new', phase: 'pre', queue: [0, 1], i: 0, res: [], cur: null };
}
function unitStatus(u) {
  const g = S.grammar[u.id];
  if (!g) return '<span class="chip">Nueva</span>';
  if (g.next && g.next <= Date.now()) return '<span class="chip amber">Repaso pendiente</span>';
  const d = Math.max(1, Math.round((g.next - Date.now()) / DAY));
  return `<span class="chip good">${g.score}% · repaso en ${d} d</span>`;
}
VIEWS.gramatica = () => {
  const st = UI.gramatica;
  if (st && st.id) return unitView(st);
  const levels = ['A1', 'A2', 'A2–B1', 'B1'];
  return `<section class="head" style="margin-bottom:18px"><p class="mono eyebrow">Estructura del idioma</p><h1>Gramática</h1>
    <p class="lede">Unidades de 8 minutos: intentas, entiendes la regla y el error típico del hispanohablante, y practicas recordando. Cada unidad vuelve a los 1, 3, 7, 16 y 35 días.</p></section>
    ${levels.map(l => { const us = GRAMMAR.filter(u => u.level === l); return us.length ? `<h3 style="margin:18px 0 10px">${l}</h3><div class="list">${us.map(u => `<button class="list-btn" data-act="gOpen" data-id="${u.id}"><span class="grow"><b>${esc(u.title)}</b></span>${unitStatus(u)}</button>`).join('')}</div>` : ''; }).join('')}`;
};
ACT.gOpen = el => { const g = S.grammar[el.dataset.id]; UI.gramatica = startUnit(el.dataset.id, g ? 'review' : 'new'); render(); window.scrollTo(0, 0); };
ACT.gLearnAgain = () => { const st = UI.gramatica; UI.gramatica = Object.assign(startUnit(st.id, 'new'), { phase: 'learn' }); render(); window.scrollTo(0, 0); };
ACT.gList = () => { UI.gramatica = null; render(); };

function explanation(u) {
  return `<div class="stack-lg">
    <div class="stack"><p class="mono eyebrow">La idea</p><p class="prose" style="font-size:1.08rem">${esc(u.idea)}</p></div>
    <div class="stack"><p class="mono eyebrow">Cómo se forma</p><div class="table-wrap"><table><thead><tr><th>Forma</th><th>Ejemplo</th></tr></thead><tbody>${u.form.map(([f, e]) => `<tr><td>${esc(f)}</td><td lang="en">${esc(e)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="stack"><p class="mono eyebrow">Errores típicos del hispanohablante</p>${u.errors.map(([w, r, why]) => `<div class="panel wrongright"><span class="wrong" lang="en">${esc(w)}</span><span class="right" lang="en">${esc(r)}</span><span class="small muted">${esc(why)}</span></div>`).join('')}</div>
    <div class="stack"><p class="mono eyebrow">Ejemplos de tu mundo</p><div class="list">${u.examples.map(([en, es]) => `<div class="row" style="flex-wrap:nowrap;align-items:flex-start">${playBtn(en)}<div class="grow"><span lang="en">${esc(en)}</span><div class="small muted">${esc(es)}</div></div></div>`).join('')}</div></div>
  </div>`;
}
function unitView(st) {
  const u = GRAMMAR.find(x => x.id === st.id);
  let h = `<button class="back" data-act="gList">${ICON.back} Todas las unidades</button>
    <section class="head" style="margin:10px 0 16px"><div class="row"><span class="chip">${esc(u.level)}</span><span class="chip ${st.mode === 'review' ? 'amber' : 'pine'}">${st.mode === 'review' ? 'Repaso' : 'Unidad nueva'}</span></div><h1>${esc(u.title)}</h1></section>`;
  if (st.phase === 'learn') {
    return h + `<div class="card lift">${explanation(u)}</div>
      <div class="row" style="margin:16px 0"><button class="btn btn-primary btn-lg" data-act="gPractice">Practicar (${u.ex.length - 2} ejercicios) ${ICON.next}</button></div>${tutorBox('g-' + u.id, 'Grammar unit: ' + u.title)}`;
  }
  if (st.phase === 'done') {
    const score = st.score;
    return h + `<div class="card lift stack" style="align-items:center;text-align:center;padding:28px 18px"><p class="mono faint">Unidad completada</p><div class="timer">${score}%</div>
      <p class="muted">${score >= 75 ? 'Bien consolidada. Volverá en unos días para fijarla.' : 'Volverá mañana: equivocarse en el repaso es parte del aprendizaje.'}</p></div>
      <div class="card stack" style="margin-top:14px"><h3>Puntos clave</h3><ul class="prose" style="margin:0;padding-left:18px">${u.errors.map(([w, r]) => `<li><span class="wrong" lang="en">${esc(w)}</span> → <span class="right" lang="en">${esc(r)}</span></li>`).join('')}</ul></div>
      <div class="row" style="margin:16px 0"><button class="btn btn-primary" data-act="goHome">Volver al plan</button><button class="btn" data-act="gList">Otra unidad</button><button class="btn btn-ghost" data-act="gLearnAgain">Ver la explicación</button></div>
      ${tutorBox('g-' + u.id, 'Grammar unit: ' + u.title)}`;
  }
  if (st.phase === 'pre') h += `<p class="note pine" style="margin-bottom:14px"><b>Calentamiento:</b> responde antes de ver la explicación. Equivocarte aquí no cuenta y te ayuda a aprender después.</p>`;
  if (st.mode === 'review') h += `<details class="card" style="margin-bottom:14px"><summary style="cursor:pointer;font-weight:700">Recordar la explicación</summary><div style="margin-top:12px">${explanation(u)}</div></details>`;
  const exIdx = st.queue[st.i], ex = u.ex[exIdx];
  if (!st.cur) st.cur = { answered: false, ok: false, pool: ex[0] === 'order' ? shuffle(ex[1].map((w, k) => k)) : null, built: [] };
  h += `<div class="card lift stack-lg">
    <div class="row-between"><span class="mono faint">${st.phase === 'pre' ? 'Calentamiento' : 'Ejercicio'} ${st.i + 1} de ${st.queue.length}</span><div class="dots">${st.queue.map((_, k) => `<i class="${k < st.i ? (st.res[k] ? 'ok' : 'no') : k === st.i ? 'cur' : ''}"></i>`).join('')}</div></div>
    ${exerciseHTML(ex, st.cur)}
  </div>`;
  return h;
}
function exerciseHTML(ex, cur) {
  const [type] = ex, a = cur.answered;
  const fb = (ok, right, why) => `<div class="feedback ${ok ? 'ok' : 'no'}"><p><b>${ok ? 'Correcto.' : 'No es así.'}</b>${!ok && right ? ` Respuesta: <span lang="en">${esc(right)}</span>` : ''}</p>${why ? `<p class="muted">${esc(why)}</p>` : ''}</div>`;
  const next = a ? `<button class="btn btn-primary" data-act="gNext">Siguiente ${ICON.next}</button>` : '';
  if (type === 'mc') {
    const [, q, opts, ans, why] = ex;
    return `<p style="font-size:1.12rem" lang="en"><b>${esc(q)}</b></p>
      <div class="opts">${opts.map((o, k) => `<button class="opt ${a ? (k === ans ? 'ok' : k === cur.given ? 'no' : '') : ''}" data-act="gMc" data-k="${k}" ${a ? 'disabled' : ''} lang="en"><span class="k">${'ABCD'[k]}</span>${esc(o)}</button>`).join('')}</div>
      ${a ? fb(cur.ok, '', why) + next : ''}`;
  }
  if (type === 'fill' || type === 'fix') {
    const [, q, acc, why] = ex;
    return `<p class="small muted">${type === 'fill' ? 'Completa el espacio (escribe solo lo que falta).' : 'Esta frase tiene un error. Corrígela editando el texto.'}</p>
      <p style="font-size:1.12rem" lang="en"><b>${esc(q)}</b></p>
      <div class="row"><input id="gx" class="input grow ${a ? (cur.ok ? 'ok' : 'no') : ''}" lang="en" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(a ? cur.given : (type === 'fix' ? q : ''))}" ${a ? 'disabled' : ''}>${a ? '' : '<button class="btn btn-primary" data-act="gType">Comprobar</button>'}</div>
      ${a ? fb(cur.ok, acc[0], why) + next : ''}`;
  }
  if (type === 'order') {
    const [, words, answer, es] = ex;
    return `<p class="small muted">Ordena las palabras. Pista: «${esc(es)}»</p>
      <div class="answer-line">${cur.built.length ? cur.built.map((k, n) => `<button class="token" data-act="gUnpick" data-n="${n}" ${a ? 'disabled' : ''} lang="en">${esc(words[k])}</button>`).join('') : '<span class="small faint">Toca las palabras en orden</span>'}</div>
      <div class="tokens">${cur.pool.map(k => `<button class="token ${cur.built.includes(k) ? 'used' : ''}" data-act="gPick" data-k="${k}" ${a ? 'disabled' : ''} lang="en">${esc(words[k])}</button>`).join('')}</div>
      ${a ? fb(cur.ok, answer, '') + next : `<button class="btn btn-primary" data-act="gOrder" ${cur.built.length === words.length ? '' : 'disabled'}>Comprobar</button>`}`;
  }
  return '';
}
function gAnswer(ok, given) { const st = UI.gramatica; st.cur.answered = true; st.cur.ok = ok; st.cur.given = given; st.res[st.i] = ok ? 1 : 0; render(); }
ACT.gMc = el => { const u = GRAMMAR.find(x => x.id === UI.gramatica.id), ex = u.ex[UI.gramatica.queue[UI.gramatica.i]], k = Number(el.dataset.k); gAnswer(k === ex[3], k); };
ACT.gType = () => {
  const st = UI.gramatica, u = GRAMMAR.find(x => x.id === st.id), ex = u.ex[st.queue[st.i]], v = ($('#gx') || {}).value || '';
  if (!v.trim()) { toast('Escribe tu respuesta.'); return; }
  gAnswer(checkAnswer(v, ex[2]).ok, v);
};
ACT.gPick = el => { const st = UI.gramatica; st.cur.built.push(Number(el.dataset.k)); render(); };
ACT.gUnpick = el => { const st = UI.gramatica; st.cur.built.splice(Number(el.dataset.n), 1); render(); };
ACT.gOrder = () => { const st = UI.gramatica, u = GRAMMAR.find(x => x.id === st.id), ex = u.ex[st.queue[st.i]]; const s = st.cur.built.map(k => ex[1][k]).join(' '); gAnswer(norm(s) === norm(ex[2]), s); };
ACT.gNext = () => {
  const st = UI.gramatica, u = GRAMMAR.find(x => x.id === st.id);
  st.i++; st.cur = null;
  if (st.i < st.queue.length) { render(); return; }
  if (st.phase === 'pre') { st.phase = 'learn'; st.res = []; render(); window.scrollTo(0, 0); return; }
  const score = pct(st.res.reduce((a, b) => a + b, 0), st.res.length);
  const g = S.grammar[u.id] || { first: Date.now(), step: -1 };
  g.step = score >= 75 ? Math.min((g.step ?? -1) + 1, G_INT.length - 1) : 0;
  g.score = score; g.last = Date.now(); g.next = Date.now() + G_INT[g.step] * DAY;
  S.grammar[u.id] = g; commit();
  st.phase = 'done'; st.score = score; autoStep('gramatica'); render(); window.scrollTo(0, 0);
};
ACT.gPractice = () => { const st = UI.gramatica, u = GRAMMAR.find(x => x.id === st.id); st.phase = 'practice'; st.queue = u.ex.map((_, i) => i).slice(2); st.i = 0; st.res = []; st.cur = null; render(); window.scrollTo(0, 0); };
addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target && ev.target.id === 'gx') { ev.preventDefault(); ACT.gType(); } });
