/* ================= Plan diario («prescripción») ================= */
const STEP_DEFS = {
  repaso: { title: 'Repaso espaciado', min: 10, view: 'repaso', why: 'Recordar sin mirar, justo antes de olvidar, es lo que más fija el vocabulario.' },
  sonidos: { title: 'Oído fino', min: 6, view: 'sonidos', why: 'Muchas voces diciendo pares mínimos entrenan tu oído para sonidos que el español no distingue.' },
  escucha: { title: 'Escucha activa y shadowing', min: 12, view: 'escucha', why: 'Primero el significado, luego el detalle: dictado y repetir en voz alta.' },
  gramatica: { title: 'Gramática en dosis', min: 8, view: 'gramatica', why: 'Intentas antes de la explicación, ves el error típico y practicas recordando.' },
  habla: { title: 'Habla', min: 12, view: 'habla', why: 'Producir te hace notar lo que te falta; repetir con menos tiempo construye fluidez.' },
  lectura: { title: 'Lectura graduada', min: 8, view: 'lectura', why: 'Input comprensible: ofertas de trabajo, vida diaria y tu carrera, con vocabulario en contexto.' },
  escritura: { title: 'Escritura con corrección', min: 8, view: 'escritura', why: 'Escribir despacio te deja notar y corregir patrones que al hablar se escapan.' },
  cierre: { title: 'Cierre y plan de mañana', min: 2, view: 'hoy', why: 'Decidir cuándo y dónde estudiarás mañana aumenta mucho la probabilidad de hacerlo.' }
};
const SUNDAY_MIN = { repaso: 15, escucha: 10, habla: 10, cierre: 2 };
function planIds() {
  const dow = new Date().getDay();
  if (dow === 0) return ['repaso', 'escucha', 'habla', 'cierre'];
  return ['repaso', 'sonidos', 'escucha', 'gramatica', 'habla', dow % 2 ? 'lectura' : 'escritura', 'cierre'];
}
const stepMin = id => new Date().getDay() === 0 ? SUNDAY_MIN[id] : STEP_DEFS[id].min;

function pickHvptSet() {
  const rank = { Alta: 0, Media: 1, Baja: 2 };
  const sets = HVPT_SETS.slice().sort((a, b) => rank[a.prio] - rank[b.prio]);
  const unseen = sets.find(s => !S.hvpt[s.id]);
  if (unseen) return unseen;
  const acc = s => { const r = S.hvpt[s.id].last || []; return r.length ? r.reduce((x, y) => x + y, 0) / r.length : 0; };
  return sets.slice().sort((a, b) => (acc(a) - acc(b)) || (rank[a.prio] - rank[b.prio]))[0];
}
function pickDialogue(ctx) { return pickItem(DIALOGUES, ctx, d => S.listening[d.id]).id; }
function grammarStart() { const id = S.level === 'B2' ? 'g-passive' : S.level === 'B1' ? 'g-perfect' : null; return id ? Math.max(0, GRAMMAR.findIndex(u => u.id === id)) : 0; }
function pickGrammar() {
  const now = Date.now();
  const due = GRAMMAR.filter(u => S.grammar[u.id] && S.grammar[u.id].next && S.grammar[u.id].next <= now).sort((a, b) => S.grammar[a.id].next - S.grammar[b.id].next);
  if (due.length) return { id: due[0].id, mode: 'review' };
  const fresh = GRAMMAR.slice(grammarStart()).concat(GRAMMAR.slice(0, grammarStart())).find(u => !S.grammar[u.id]);
  if (fresh) return { id: fresh.id, mode: 'new' };
  const oldest = GRAMMAR.slice().sort((a, b) => (S.grammar[a.id].next || 0) - (S.grammar[b.id].next || 0))[0];
  return { id: oldest.id, mode: 'review' };
}
function pickSpeaking(di, ctx) {
  const on = ctxOn(), inCtx = list => { const p = list.filter(x => x.ctx === ctx); return p.length ? p : (list.filter(x => on.includes(x.ctx)).length ? list.filter(x => on.includes(x.ctx)) : list); };
  if (IN_CLAUDE && di % 2 === 1) { const p = inCtx(ROLEPLAYS); return { type: 'ia', id: p[Math.floor(di / 2) % p.length].id }; }
  const p = inCtx(CUE_CARDS); return { type: '432', id: p[Math.floor(di / 2) % p.length].id };
}
function pickReading(ctx) { return pickItem(READINGS, ctx, r => S.reading[r.id]).id; }
function writingPool() { return WRITING_PROMPTS.filter(w => (S.level === 'A1' || S.level === 'A2') ? w.level === 'A2' : true); }
function pickWriting(ctx) { const pool = writingPool(), p = pool.filter(w => w.ctx === ctx), l = p.length ? p : pool; return l[S.writing.length % l.length].id; }

function ensurePlan() {
  const t = today();
  if (t.plan && t.plan.ids && t.plan.v === 2) return t.plan;
  const di = dayIndex(), rot = ctxRotation(), c = off => rot[(di + off) % rot.length];
  t.plan = { v: 2, ids: planIds(), sonidos: pickHvptSet().id, escucha: pickDialogue(c(0)), gramatica: pickGrammar(), habla: pickSpeaking(di, c(2)), lectura: pickReading(c(1)), escritura: pickWriting(c(3)) };
  commit();
  return t.plan;
}
function stepWhat(id, plan) {
  switch (id) {
    case 'repaso': { const c = srsCounts(); return c.total ? `${plural(c.due + c.learn, 'tarjeta pendiente', 'tarjetas pendientes')} · ${plural(c.newAvail + c.prodAvail, 'nueva', 'nuevas')}` : 'Al día: no hay tarjetas pendientes'; }
    case 'sonidos': { const s = HVPT_SETS.find(x => x.id === plan.sonidos); return `Contraste ${s.a} frente a ${s.b} (${s.name})`; }
    case 'escucha': { const d = DIALOGUES.find(x => x.id === plan.escucha); return `«${d.title}» · ${d.level}`; }
    case 'gramatica': { const u = GRAMMAR.find(x => x.id === plan.gramatica.id); return `${plan.gramatica.mode === 'review' ? 'Repaso' : 'Nueva'}: ${u.title} · ${u.level}`; }
    case 'habla': {
      if (plan.habla.type === 'ia') { const r = ROLEPLAYS.find(x => x.id === plan.habla.id); return `Conversación con IA: ${r.title}`; }
      const c = CUE_CARDS.find(x => x.id === plan.habla.id); return `Técnica 4/3/2: «${c.title}»`;
    }
    case 'lectura': { const r = READINGS.find(x => x.id === plan.lectura); return `«${r.title}» · ${r.level}`; }
    case 'escritura': { const w = WRITING_PROMPTS.find(x => x.id === plan.escritura); return `${w.title} (${w.words} palabras)`; }
    case 'cierre': return 'Resumen del día y cuándo harás la próxima sesión';
  }
  return '';
}
function openStep(id) {
  const plan = ensurePlan();
  switch (id) {
    case 'repaso': return go('repaso', { mode: 'study' });
    case 'sonidos': return go('sonidos', { tab: 'hvpt', set: plan.sonidos, run: newHvptRun(plan.sonidos) });
    case 'escucha': return go('escucha', { id: plan.escucha, step: 0 });
    case 'gramatica': return go('gramatica', startUnit(plan.gramatica.id, plan.gramatica.mode));
    case 'habla':
      if (plan.habla.type === 'ia') return go('habla', { tab: 'ia', chat: AI.ok() ? newChat(plan.habla.id) : null });
      return go('habla', { tab: '432', t432: { card: plan.habla.id, phase: 'intro' } });
    case 'lectura': return go('lectura', { id: plan.lectura });
    case 'escritura': return go('escritura', { id: plan.escritura });
    case 'cierre': UI.hoy = { closing: true }; render(); setTimeout(() => { const c = $('#closing'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); return;
  }
}
function markStep(id) {
  const t = today(); if (t.steps[id]) return;
  t.steps[id] = Date.now(); commit();
  toast(`Paso completado: ${STEP_DEFS[id].title}`);
}
function autoStep(id) { const t = today(); if (t.plan && t.plan.ids.includes(id) && !t.steps[id]) markStep(id); }
function sessionBar(r) {
  const t = S.days[dkey()]; if (!t || !t.plan) return '';
  const ids = t.plan.ids, i = ids.findIndex(id => STEP_DEFS[id].view === r && id !== 'cierre' && !t.steps[id]);
  if (i < 0) return '';
  const id = ids[i];
  return `<div class="session-bar"><span>Paso ${i + 1} de ${ids.length} · ${esc(STEP_DEFS[id].title)}</span><span class="row"><button class="btn btn-sm" data-act="markStepBack" data-step="${id}">${ICON.check} Marcar hecho</button><button class="btn btn-sm btn-ghost" data-act="goHome">Volver al plan</button></span></div>`;
}
ACT.markStepBack = el => { markStep(el.dataset.step); go('hoy', null); };
ACT.startStep = el => openStep(el.dataset.step);
ACT.toggleStep = el => { const t = today(); const id = el.dataset.step; if (t.steps[id]) { delete t.steps[id]; commit(); render(); } else { markStep(id); render(); } };

/* Blíster: nivel de cumplimiento de un día */
function dayFill(k) {
  const d = S.days[k]; if (!d) return 0;
  const steps = Object.keys(d.steps || {}).length, n = d.plan ? d.plan.ids.length : 7;
  if (d.sec >= 40 * 60 || steps >= n - 1) return 2;
  if (d.sec >= 15 * 60 || steps >= 2) return 1;
  return 0;
}
function capsule(k, isToday) { const f = dayFill(k); return `<span class="cap ${f === 2 ? 'full' : f === 1 ? 'half' : ''} ${isToday ? 'today' : ''}" title="${esc(k)}"><i></i><i></i></span>`; }
function weekBlister() {
  const now = new Date(); const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  let cells = '';
  for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); const k = dkey(d); cells += `<div class="cell">${capsule(k, k === dkey())}<span>${DOW[d.getDay()]}</span></div>`; }
  return `<div class="blister" aria-label="Cumplimiento de esta semana">${cells}</div>`;
}
function streak() {
  let n = 0; const d = new Date();
  if (dayFill(dkey(d)) > 0) n++;
  d.setDate(d.getDate() - 1);
  while (dayFill(dkey(d)) > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function ring(value, max) {
  const r = 54, c = 2 * Math.PI * r, f = clamp(value / max, 0, 1);
  return `<div class="ring"><svg viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="${r}" fill="none" style="stroke:var(--sunk)" stroke-width="12"/>${f > 0 ? `<circle cx="66" cy="66" r="${r}" fill="none" style="stroke:var(--pine)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}"/>` : ''}</svg><div class="val"><b data-dose-min>${Math.floor(value)}</b><span>de ${max} min</span></div></div>`;
}

VIEWS.hoy = () => {
  const t = today(), plan = ensurePlan(), d = new Date();
  const total = plan.ids.reduce((s, id) => s + stepMin(id), 0);
  const doneN = plan.ids.filter(id => t.steps[id]).length;
  const nextId = plan.ids.find(id => !t.steps[id]);
  const closing = (UI.hoy && UI.hoy.closing) || nextId === 'cierre';
  const intention = S.intention && S.intention.for === dkey() ? S.intention : null;
  const sunday = d.getDay() === 0;
  let h = `<section class="head" style="margin-bottom:20px">
    <p class="mono eyebrow">${DOW_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} · Nivel ${esc(S.level)}</p>
    <h1>Tu dosis de hoy</h1>
    <p class="lede">${doneN === plan.ids.length ? 'Dosis completa. Lo que repasaste hoy se consolida mejor después de dormir.' : `${doneN} de ${plan.ids.length} pasos · unos ${total} minutos en total.`}</p>
    ${intention ? `<p class="note pine">Tu plan para hoy: <b>${esc(intention.when)}</b>${intention.where ? `, en <b>${esc(intention.where)}</b>` : ''}.</p>` : ''}
  </section>`;
  if (!S.onboarded) h += `<section class="card lift stack" style="margin-bottom:18px">
    <p class="mono eyebrow">Antes de empezar</p>
    <h2>Te doy la bienvenida</h2>
    <p class="prose">Me dijiste que estás entre A1 y A2. Empezaré en A2 y repasaré lo básico rápido. Si prefieres confirmarlo, la prueba de nivel toma unos 6 minutos y puedes repetirla cada mes para medir tu avance.</p>
    <div class="stack" style="gap:8px"><p class="small"><b>¿En qué contextos quieres practicar?</b> El plan mezcla los que actives; puedes cambiarlos cuando quieras en Progreso › Ajustes.</p>${ctxToggles()}</div>
    <div class="row"><button class="btn btn-primary" data-act="goPlacement">Hacer la prueba de nivel</button><button class="btn" data-act="setLevel" data-level="A2">Empezar en A2</button><button class="btn btn-ghost" data-act="setLevel" data-level="A1">Empezar en A1</button></div>
  </section>`;
  h += `<div class="today-grid"><article class="rx">
    <header class="rx-head"><span class="rx-mark" aria-hidden="true">℞</span><div class="grow"><p class="mono faint">Prescripción diaria · inglés</p><p class="rx-sig">Sig.: ${sunday ? 'dosis ligera de domingo, ~' + total + ' min' : '1 sesión de ~' + total + ' min, 6 días por semana'}</p><p class="small faint">Contextos: ${esc(ctxOn().map(k => CTX[k]).join(' · '))}</p></div></header>
    <ol class="steps">${plan.ids.map((id, i) => {
      const def = STEP_DEFS[id], done = !!t.steps[id], isNext = id === nextId;
      return `<li class="step ${done ? 'done' : ''} ${isNext ? 'next' : ''}">
        <span class="step-n">${done ? '✓' : i + 1}</span>
        <div class="grow"><div class="step-top"><b>${esc(def.title)}</b><span class="mono faint">${stepMin(id)} min</span></div>
          <p class="small muted">${esc(stepWhat(id, plan))}</p>
          ${isNext ? `<p class="why">Por qué: ${esc(def.why)}</p>` : ''}
          <div class="step-act">${done ? `<button class="btn btn-sm btn-ghost" data-act="startStep" data-step="${id}">Repetir</button><button class="btn btn-sm btn-ghost" data-act="toggleStep" data-step="${id}">Desmarcar</button>` : `<button class="btn btn-sm ${isNext ? 'btn-primary' : ''}" data-act="startStep" data-step="${id}">${isNext ? 'Empezar' : 'Abrir'}</button>${id !== 'cierre' ? `<button class="btn btn-sm btn-ghost" data-act="toggleStep" data-step="${id}">Marcar hecho</button>` : ''}`}</div>
        </div></li>`;
    }).join('')}</ol>
  </article>
  <aside class="side">
    <div class="card dose">${ring(t.sec / 60, total)}<p class="small muted">Minutos de estudio activo hoy</p></div>
    <div class="card stack"><div class="row-between"><b>Esta semana</b><span class="chip amber">Racha: ${plural(streak(), 'día', 'días')}</span></div>${weekBlister()}<p class="small faint">Cápsula completa: sesión cumplida. Media: al menos 15 min.</p></div>
    <a class="btn btn-ghost" href="#ciencia" data-act="nav" data-navlink="ciencia">Por qué funciona este plan ${ICON.next}</a>
  </aside></div>`;
  if (closing) h += closingPanel(t, plan);
  return h;
};

function closingPanel(t, plan) {
  const g = GRAMMAR.find(u => u.id === plan.gramatica.id);
  const mcs = g ? g.ex.filter(e => e[0] === 'mc') : [];
  const q = mcs.length ? mcs[dayIndex() % mcs.length] : null;
  const cq = UI.hoy && UI.hoy.cq;
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  return `<section id="closing" class="card lift stack-lg" style="margin-top:22px">
    <div class="head"><p class="mono eyebrow">Paso final</p><h2>Cierre del día</h2></div>
    <div class="grid-3">
      <div class="kv"><span class="small muted">Estudio activo</span><b>${Math.floor(t.sec / 60)} min</b></div>
      <div class="kv"><span class="small muted">Tarjetas repasadas</span><b>${t.rev}</b></div>
      <div class="kv"><span class="small muted">Recordadas</span><b>${pct(t.ok, t.rev)}%</b></div>
    </div>
    ${q ? `<div class="stack"><h3>Pregunta para comprobar</h3><p class="small muted">Del tema de gramática de hoy: ${esc(g.title)}</p><p><b>${esc(q[1])}</b></p>
      <div class="opts">${q[2].map((o, i) => `<button class="opt ${cq !== undefined && cq !== null ? (i === q[3] ? 'ok' : i === cq ? 'no' : '') : ''}" data-act="closeQ" data-i="${i}" ${cq !== undefined && cq !== null ? 'disabled' : ''}><span class="k">${'ABC'[i]}</span>${esc(o)}</button>`).join('')}</div>
      ${cq !== undefined && cq !== null ? `<p class="feedback ${cq === q[3] ? 'ok' : 'no'}">${cq === q[3] ? 'Correcto.' : 'Repásalo mañana.'} ${esc(q[4])}</p>` : ''}</div>` : ''}
    <div class="stack"><h3>¿Cuándo y dónde harás la sesión de mañana?</h3>
      <p class="small muted">Una intención concreta («a las 6:30 p. m., en la biblioteca, después de clase») funciona mucho mejor que «mañana estudio».</p>
      <div class="grid-2"><div class="field"><label for="int-when">Cuándo (${DOW_LONG[tom.getDay()]})</label><input id="int-when" class="input" placeholder="Ej.: a las 6:30 p. m., después de clase" data-input="keep" value="${esc(kept('int-when'))}"></div>
      <div class="field"><label for="int-where">Dónde</label><input id="int-where" class="input" placeholder="Ej.: en la biblioteca" data-input="keep" value="${esc(kept('int-where'))}"></div></div>
      <div class="row"><button class="btn btn-primary" data-act="saveIntention">${ICON.check} Guardar y cerrar el día</button></div></div>
  </section>`;
}
ACT.closeQ = el => { UI.hoy = Object.assign({}, UI.hoy, { closing: true, cq: Number(el.dataset.i) }); render(); setTimeout(() => { const c = $('#closing'); if (c) c.scrollIntoView({ block: 'start' }); }, 30); };
ACT.saveIntention = () => {
  const when = ($('#int-when') || {}).value || '', where = ($('#int-where') || {}).value || '';
  if (!when.trim()) { toast('Escribe al menos cuándo lo harás.'); return; }
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  S.intention = { when: when.trim().slice(0, 120), where: where.trim().slice(0, 120), for: dkey(tom) };
  today().steps.cierre = Date.now(); commit(); UI.hoy = null; toast('Plan guardado. ¡Hasta mañana!'); render(); window.scrollTo(0, 0);
};
ACT.goPlacement = () => go('nivel', { i: 0, answers: [] });
ACT.setLevel = el => { S.level = el.dataset.level; S.onboarded = true; const t = today(); delete t.plan; commit(); render(); toast(`Nivel ${S.level}: plan ajustado`); };

VIEWS.practicar = () => `<section class="head" style="margin-bottom:18px"><p class="mono eyebrow">Practicar por tu cuenta</p><h1>Laboratorio de práctica</h1><p class="lede">Cada módulo funciona dentro del plan diario, pero también puedes entrar libremente.</p></section>
  <div class="grid-2">${PRACTICE.map(([id, name, desc]) => `<a class="card list-btn" href="#${id}" data-act="nav" data-navlink="${id}" style="align-items:flex-start;text-decoration:none"><span class="icon-btn" aria-hidden="true">${ICON[id]}</span><span class="stack" style="gap:4px"><b style="font-family:var(--font-display);font-size:1.15rem">${name}</b><span class="small muted">${desc}</span></span></a>`).join('')}</div>`;
