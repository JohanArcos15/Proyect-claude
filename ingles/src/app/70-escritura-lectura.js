/* ================= Escritura ================= */
const SELF_CHECK = [
  'Cada oración tiene sujeto (It is…, There are…), aunque en español lo omitirías.',
  'Con he / she / it el verbo en presente lleva -s (she takes).',
  'Preguntas y negativas usan do / does / did y el verbo en forma base.',
  'Pasados irregulares correctos (took, felt, made, bought).',
  'Sin «the» cuando hablas en general (Antibiotics don\'t…).',
  'Adjetivo antes del sustantivo (a strong drug) y sin plural (strong drugs).',
  'Revisa los falsos amigos (actually, assist, career, realize).',
  'Usa conectores: first, then, however, because, so.'
];
const wordCount = s => (String(s).trim().match(/\b[\w'’-]+\b/g) || []).length;
function draftKey(id) { return 'dosis-draft:' + id; }
function loadDraft(id) { try { return localStorage.getItem(draftKey(id)) || ''; } catch (e) { return ''; } }
function saveDraft(id, v) { try { localStorage.setItem(draftKey(id), v); } catch (e) { /* sin almacenamiento */ } }

VIEWS.escritura = () => {
  const st = UI.escritura || (UI.escritura = {});
  if (st.id) return writeView(st);
  const lv = l => WRITING_PROMPTS.filter(w => w.level === l);
  return `<section class="head" style="margin-bottom:18px"><p class="mono eyebrow">Expresión escrita</p><h1>Escritura</h1>
    <p class="lede">Escribir despacio te deja notar errores que al hablar se escapan. Luego esos patrones corregidos pasan a tu habla.</p></section>
    ${['A2', 'B1'].map(l => `<h3 style="margin:18px 0 10px">${l}</h3><div class="list">${lv(l).map(w => { const n = S.writing.filter(x => x.id === w.id).length; return `<button class="list-btn" data-act="wOpen" data-id="${w.id}"><span class="grow"><b>${esc(w.title)}</b><span class="small muted" style="display:block">${esc(w.words)} palabras</span></span>${n ? `<span class="chip good">${plural(n, 'vez', 'veces')}</span>` : ''}</button>`; }).join('')}</div>`).join('')}
    ${S.writing.length ? `<h3 style="margin:22px 0 10px">Tus textos recientes</h3><div class="list">${S.writing.slice().reverse().slice(0, 6).map(w => `<details><summary style="cursor:pointer"><b>${esc((WRITING_PROMPTS.find(p => p.id === w.id) || {}).title || 'Texto')}</b> <span class="small muted">· ${esc(w.d)}${w.level ? ' · nivel estimado ' + esc(w.level) : ''}</span></summary><p class="small" style="white-space:pre-wrap;margin-top:8px" lang="en">${esc(w.text)}</p></details>`).join('')}</div>` : ''}`;
};
ACT.wOpen = el => { UI.escritura = { id: el.dataset.id }; render(); };
ACT.wBack = () => { UI.escritura = {}; render(); };
function writeView(st) {
  const w = WRITING_PROMPTS.find(x => x.id === st.id), draft = st.text !== undefined ? st.text : loadDraft(w.id);
  const n = wordCount(draft);
  return `<button class="back" data-act="wBack">${ICON.back} Todas las tareas</button>
    <section class="head" style="margin:10px 0 14px"><div class="row"><span class="chip">${esc(w.level)}</span><span class="chip pine">${esc(w.words)} palabras</span></div><h1>${esc(w.title)}</h1></section>
    <div class="card lift stack-lg">
      <p style="font-size:1.08rem" lang="en"><b>${esc(w.task)}</b></p>
      <div class="stack" style="gap:6px"><p class="mono faint">Bloques útiles</p><div class="row">${w.chunks.map(c => `<span class="chip" lang="en">${esc(c)}</span>`).join('')}</div></div>
      <div class="field"><label for="wtext">Tu texto</label><textarea id="wtext" class="textarea" style="min-height:220px" lang="en" spellcheck="false" data-input="wText">${esc(draft)}</textarea>
        <span class="small faint" id="wcount">${n} palabras · el borrador se guarda en este navegador</span></div>
      <div class="row">${AI.ok() ? `<button class="btn btn-primary" data-act="wReview" ${st.busy ? 'disabled' : ''}>${ICON.spark} Revisar con IA</button>` : ''}<button class="btn ${AI.ok() ? '' : 'btn-primary'}" data-act="wSelf">${AI.ok() ? 'Autorrevisión' : 'Revisar con la lista'}</button></div>
      ${AI.ok() ? '' : AI_OFF_NOTE()}
      ${st.busy ? '<p class="small muted"><span class="thinking"><i></i><i></i><i></i></span> El tutor está leyendo tu texto…</p>' : ''}
      ${st.err ? `<p class="feedback no">${esc(st.err)}</p>` : ''}
      ${st.self ? `<div class="stack"><h3>Lista de autorrevisión</h3><p class="small muted">Lee tu texto una vez por cada punto. Revisar con un solo foco cada vez encuentra más errores.</p>${SELF_CHECK.map((c, i) => `<label class="row" style="flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" id="sc-${i}" style="margin-top:4px"><span>${esc(c)}</span></label>`).join('')}<div><button class="btn btn-sm" data-act="wDone">${ICON.check} Terminé la revisión</button></div></div>` : ''}
    </div>
    ${st.fb ? writeFB(st.fb) : ''}`;
}
INP.wText = el => { const st = UI.escritura; st.text = el.value; saveDraft(st.id, el.value); const c = $('#wcount'); if (c) c.textContent = `${wordCount(el.value)} palabras · el borrador se guarda en este navegador`; };
ACT.wSelf = () => { UI.escritura.self = !UI.escritura.self; render(); };
ACT.wDone = () => { const st = UI.escritura, text = st.text !== undefined ? st.text : loadDraft(st.id); if (wordCount(text) < 15) { toast('Escribe un poco más antes de terminar.'); return; } S.writing.push({ d: dkey(), id: st.id, text: text.slice(0, 3000) }); commit(); autoStep('escritura'); toast('Texto guardado en tu historial.'); };
ACT.wReview = async () => {
  const st = UI.escritura, w = WRITING_PROMPTS.find(x => x.id === st.id), text = st.text !== undefined ? st.text : loadDraft(st.id);
  if (wordCount(text) < 15) { toast('Escribe al menos 15 palabras.'); return; }
  st.busy = true; st.err = null; render();
  try {
    st.fb = await AI.fn.json(`You are an expert English writing tutor. ${learner()}
Task given to the learner: "${w.task}" (target length ${w.words} words).
Analyze the learner's text below. Reply with ONLY a JSON object:
{"nivel": "estimated CEFR level of this text, e.g. A2 or B1",
 "resumen": "2-3 sentences in Spanish: what is good and what to prioritize",
 "correcciones": [{"original": "exact fragment from the text", "corregido": "corrected fragment", "tipo": "gramática | vocabulario | ortografía | puntuación | estilo", "explicacion": "short explanation in Spanish; say when it is a typical transfer error from Spanish"}],
 "version_mejorada": "the text rewritten correctly, keeping the learner's ideas and a level only slightly above theirs",
 "siguiente": "one concrete action in Spanish for the next text"}
At most 8 corrections: errors that affect meaning and recurring patterns first. Do not invent errors and do not correct correct sentences.
Learner's text:
"""${text.slice(0, 5000)}"""`, { modelTier: 'default' });
    S.writing.push({ d: dkey(), id: st.id, text: text.slice(0, 3000), level: String(st.fb.nivel || '').slice(0, 6) }); commit(); autoStep('escritura');
  } catch (e) { st.err = AI.fail(e); }
  st.busy = false; render();
};
function writeFB(f) {
  const cs = Array.isArray(f.correcciones) ? f.correcciones : [];
  return `<div class="card lift stack-lg" style="margin-top:16px"><div class="row-between"><h3>Revisión del tutor</h3>${f.nivel ? `<span class="chip amber">Nivel estimado: ${esc(f.nivel)}</span>` : ''}</div>
    ${f.resumen ? `<p class="note pine">${esc(f.resumen)}</p>` : ''}
    ${cs.length ? `<div class="stack">${cs.map(c => `<div class="panel wrongright"><div class="row-between"><span class="wrong" lang="en">${esc(c.original)}</span><span class="chip">${esc(c.tipo || '')}</span></div><span class="right" lang="en">${esc(c.corregido)}</span><span class="small muted">${esc(c.explicacion)}</span></div>`).join('')}</div>` : '<p class="small muted">Sin errores importantes.</p>'}
    ${f.version_mejorada ? `<div class="stack"><p class="mono faint">Versión mejorada</p><div class="row" style="flex-wrap:nowrap;align-items:flex-start">${playBtn(f.version_mejorada)}<p class="grow" style="white-space:pre-wrap" lang="en">${esc(f.version_mejorada)}</p></div></div>` : ''}
    ${f.siguiente ? `<p class="small"><b>Para el próximo texto:</b> ${esc(f.siguiente)}</p>` : ''}
    <p class="small faint">La IA puede equivocarse. Si una corrección te parece extraña, pregúntale el porqué en Gramática › Pregúntale al tutor.</p></div>`;
}

/* ================= Lectura ================= */
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
VIEWS.lectura = () => {
  const st = UI.lectura || (UI.lectura = {});
  if (st.id) return readView(st);
  return `<section class="head" style="margin-bottom:18px"><p class="mono eyebrow">Comprensión lectora</p><h1>Lectura</h1>
    <p class="lede">Textos graduados sobre tu carrera. Toca las palabras subrayadas para ver su traducción; las preguntas siguen el formato True / False / Not given de los exámenes.</p></section>
    <div class="list">${READINGS.map(r => { const rec = S.reading[r.id]; return `<button class="list-btn" data-act="rOpen" data-id="${r.id}"><span class="grow"><b lang="en">${esc(r.title)}</b><span class="small muted" style="display:block">${r.minutes} min</span></span><span class="row" style="flex-wrap:nowrap"><span class="chip">${esc(r.level)}</span>${rec ? `<span class="chip good">${rec.score}%</span>` : ''}</span></button>`; }).join('')}</div>`;
};
ACT.rOpen = el => { UI.lectura = { id: el.dataset.id, open: {}, qa: {} }; render(); window.scrollTo(0, 0); };
ACT.rBack = () => { TTS.stop(); UI.lectura = {}; render(); };
function glossify(paras, gloss, open) {
  const used = new Set();
  return paras.map((p, pi) => {
    let html = esc(p);
    gloss.forEach(([term], gi) => {
      if (used.has(gi)) return;
      const re = new RegExp('(^|[^A-Za-z])(' + escRe(esc(term)) + ')(?![A-Za-z])', 'i');
      if (re.test(html)) {
        used.add(gi);
        html = html.replace(re, (m, pre, w) => `${pre}<button class="gl" data-act="gloss" data-g="${gi}" aria-expanded="${!!open[gi]}">${w}</button>${open[gi] ? `<span class="pop">${esc(gloss[gi][1])}</span>` : ''}`);
      }
    });
    return `<div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:10px">${playBtn(p, '', 'Escuchar párrafo')}<p class="grow" lang="en">${html}</p></div>`;
  }).join('');
}
function readView(st) {
  const r = READINGS.find(x => x.id === st.id), answered = Object.keys(st.qa).length;
  const okN = r.q.filter((q, i) => st.qa[i] === q[3]).length;
  const TF = ['True', 'False', 'Not given'];
  return `<button class="back" data-act="rBack">${ICON.back} Todas las lecturas</button>
    <section class="head" style="margin:10px 0 14px"><div class="row"><span class="chip">${esc(r.level)}</span><span class="chip pine">${r.minutes} min</span></div><h1 lang="en">${esc(r.title)}</h1></section>
    <p class="note" style="margin-bottom:14px"><b>Antes de leer:</b> ${esc(r.before)}</p>
    <article class="card lift reader stack">${glossify(r.paras, r.gloss, st.open)}</article>
    <div class="card stack-lg" style="margin-top:16px"><h3>Preguntas</h3>
      ${r.q.map((q, i) => { const a = st.qa[i], opts = q[0] === 'tf' ? TF : q[2]; return `<div class="stack"><p><b>${i + 1}.</b> <span lang="en">${esc(q[1])}</span></p><div class="${q[0] === 'tf' ? 'grid-3' : 'opts'}">${opts.map((o, k) => `<button class="opt ${a !== undefined ? (k === q[3] ? 'ok' : k === a ? 'no' : '') : ''}" data-act="rAns" data-q="${i}" data-k="${k}" ${a !== undefined ? 'disabled' : ''} lang="en">${q[0] === 'tf' ? '' : `<span class="k">${'ABC'[k]}</span>`}${esc(o)}</button>`).join('')}</div></div>`; }).join('')}
      ${answered === r.q.length ? `<p class="feedback ${okN >= 4 ? 'ok' : 'warn'}">${okN} de ${r.q.length}. ${okN < r.q.length ? 'Recuerda: «Not given» es cuando el texto no dice nada sobre eso, ni a favor ni en contra.' : 'Comprensión completa.'}</p>
        <div class="row"><button class="btn btn-primary" data-act="rAddWords">${ICON.plus} Añadir las palabras del texto a mi repaso</button><button class="btn" data-act="goHome">Volver al plan</button></div>` : ''}
    </div>`;
}
ACT.gloss = el => { const st = UI.lectura, g = Number(el.dataset.g); st.open[g] = !st.open[g]; render(); if (st.open[g]) TTS.speak(READINGS.find(x => x.id === st.id).gloss[g][0]); };
ACT.rAns = el => {
  const st = UI.lectura, r = READINGS.find(x => x.id === st.id); st.qa[Number(el.dataset.q)] = Number(el.dataset.k);
  if (Object.keys(st.qa).length === r.q.length) { S.reading[r.id] = { done: Date.now(), score: pct(r.q.filter((q, i) => st.qa[i] === q[3]).length, r.q.length) }; commit(); autoStep('lectura'); }
  render();
};
ACT.rAddWords = () => { const r = READINGS.find(x => x.id === UI.lectura.id); let n = 0; r.gloss.forEach(([en, es]) => { if (addCustom(en, es)) n++; }); toast(n ? `${plural(n, 'palabra añadida', 'palabras añadidas')} a tu repaso.` : 'Esas palabras ya estaban en tu mazo.'); };
