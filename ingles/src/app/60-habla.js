/* ================= Habla ================= */
const fmtClock = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
function countdown(sel, end, onEnd) {
  const tick = () => {
    const el = $(sel), left = Math.max(0, end - Date.now());
    if (el) { el.textContent = fmtClock(left); el.classList.toggle('low', left < 10000); }
    if (left <= 0) { stopTimers(); onEnd(); }
  };
  tick(); every(250, tick);
}
const FB = {};
function speechPrompt(task, transcript) {
  return `${learner()}
The learner answered this speaking task aloud: "${task}".
Below is the transcript from voice dictation. Dictation can mishear words: if a word looks misrecognized, it may be a pronunciation problem, so mention that cautiously.
Reply with ONLY a JSON object:
{"resumen": "1-2 sentences in Spanish about what they did well",
 "correcciones": [{"original": "exact fragment from the transcript", "mejor": "corrected, natural version", "explicacion": "short explanation in Spanish (say if it is a typical Spanish-speaker transfer error)"}],
 "version_natural": "a natural version of the whole answer, about one CEFR level above the learner, max 90 words",
 "pronunciacion": "one cautious pronunciation hint in Spanish, or an empty string"}
At most 4 corrections, the most important ones (meaning first, then recurring grammar). Ignore punctuation and capitalization. Do not invent errors.
Transcript:
"""${transcript.slice(0, 4000)}"""`;
}
async function runSpeechFB(key, task, transcript) {
  if (!transcript.trim()) { toast('Primero dicta o escribe lo que dijiste.'); return; }
  FB[key] = { busy: true }; render();
  try { const res = await AI.fn.json(speechPrompt(task, transcript), { modelTier: 'default' }); FB[key] = { res }; }
  catch (e) { FB[key] = { err: AI.fail(e) }; }
  render();
}
function fbHTML(key) {
  const f = FB[key]; if (!f) return '';
  if (f.busy) return '<p class="small muted"><span class="thinking"><i></i><i></i><i></i></span> El tutor está revisando…</p>';
  if (f.err) return `<p class="feedback no">${esc(f.err)}</p>`;
  const r = f.res || {};
  const cs = Array.isArray(r.correcciones) ? r.correcciones : [];
  return `<div class="stack">
    ${r.resumen ? `<p class="note pine">${esc(r.resumen)}</p>` : ''}
    ${cs.length ? cs.map(c => `<div class="panel wrongright"><span class="wrong" lang="en">${esc(c.original)}</span><span class="right" lang="en">${esc(c.mejor)}</span><span class="small muted">${esc(c.explicacion)}</span></div>`).join('') : '<p class="small muted">Sin errores importantes.</p>'}
    ${r.version_natural ? `<div class="stack" style="gap:6px"><p class="mono faint">Versión más natural</p><div class="row" style="flex-wrap:nowrap;align-items:flex-start">${playBtn(r.version_natural)}<p class="grow" lang="en">${esc(r.version_natural)}</p></div></div>` : ''}
    ${r.pronunciacion ? `<p class="note small">${esc(r.pronunciacion)}</p>` : ''}
  </div>`;
}

VIEWS.habla = () => {
  const st = UI.habla || (UI.habla = { tab: 'rapidas' });
  const tabs = [['rapidas', 'Preguntas rápidas'], ['432', 'Técnica 4/3/2'], ['ia', 'Conversación con IA'], ['voz', 'Leer en voz alta']];
  let h = `<section class="head" style="margin-bottom:16px"><p class="mono eyebrow">Expresión oral</p><h1>Habla</h1>
    <p class="lede">Habla siempre en voz alta, aunque estés solo/a. La fluidez se construye produciendo, no pensando.</p></section>
    <div class="seg" role="group" aria-label="Sección" style="margin-bottom:16px">${tabs.map(([k, l]) => `<button aria-pressed="${st.tab === k}" data-act="hTab" data-tab="${k}">${l}</button>`).join('')}</div>`;
  if (st.tab === 'rapidas') h += quickView(st);
  else if (st.tab === '432') h += view432(st);
  else if (st.tab === 'ia') h += chatView(st);
  else h += vozView(st);
  return h;
};
ACT.hTab = el => { stopTimers(); TTS.stop(); const tab = el.dataset.tab; UI.habla = { tab }; render(); };

/* Preguntas rápidas */
function quickView(st) {
  const r = st.r || (st.r = { qi: randomQuick() });
  const [q, model, chunks] = QUICK_QUESTIONS[r.qi];
  const t = today();
  return `<div class="card lift stack-lg">
    <div class="row-between"><span class="mono faint">Hoy: ${t.quick || 0} respondidas</span><span class="small muted">Responde 2–4 frases: idea + razón + ejemplo</span></div>
    <div class="row" style="gap:12px;flex-wrap:nowrap;align-items:flex-start">${playBtn(q)}<p class="grow" style="font-family:var(--font-display);font-size:1.45rem;font-weight:700;line-height:1.25" lang="en">${esc(q)}</p></div>
    <div class="row" style="align-items:center;gap:16px"><div class="timer" id="qtimer">${r.end ? fmtClock(Math.max(0, r.end - Date.now())) : '0:45'}</div>
      ${r.end && r.end > Date.now() ? `<button class="btn" data-act="qStop">Terminé</button>` : `<button class="btn btn-primary" data-act="qStart">${ICON.play} Empezar 45 s</button>`}</div>
    ${r.shown ? `<div class="stack"><p class="mono faint">Respuesta modelo</p><div class="row" style="flex-wrap:nowrap;align-items:flex-start">${playBtn(model)}<p class="grow" lang="en">${esc(model)}</p></div><p class="small muted">Bloques útiles: <span lang="en">${esc(chunks)}</span></p></div>` : `<button class="btn btn-ghost" data-act="qShow">Ver respuesta modelo</button>`}
    <hr class="hr">
    <div class="stack"><p class="small"><b>Opcional:</b> dicta tu respuesta para revisarla.</p>${dictField('q-trans', 'Tu respuesta en inglés', kept('q-trans'))}
      ${AI.ok() ? `<div class="row"><button class="btn btn-sm" data-act="qFB" ${FB.quick && FB.quick.busy ? 'disabled' : ''}>${ICON.spark} Revisar con IA</button></div>${fbHTML('quick')}` : AI_OFF_NOTE()}</div>
    <div class="row"><button class="btn btn-primary" data-act="qNext">Otra pregunta ${ICON.next}</button></div>
  </div>`;
}
function quickDone() {
  const t = today(); t.quick = (t.quick || 0) + 1; S.speaking.n++; commit();
  if (t.quick >= 5) autoStep('habla');
}
ACT.qStart = () => { const r = UI.habla.r; r.end = Date.now() + 45000; r.counted = false; render(); countdown('#qtimer', r.end, () => { chime(); if (!r.counted) { r.counted = true; quickDone(); } r.end = 1; render(); }); };
ACT.qStop = () => { stopTimers(); const r = UI.habla.r; if (!r.counted) { r.counted = true; quickDone(); } r.end = 1; render(); };
ACT.qShow = () => { UI.habla.r.shown = true; render(); };
function randomQuick(not) { const on = ctxOn(), all = QUICK_QUESTIONS.map((q, i) => i), idx = all.filter(i => on.includes(QUICK_QUESTIONS[i][3] || 'diario') && i !== not), pool = idx.length ? idx : all; return pool[Math.floor(Math.random() * pool.length)]; }
ACT.qNext = () => { stopTimers(); UI.habla.r = { qi: randomQuick(UI.habla.r.qi) }; delete FB.quick; KEEP['q-trans'] = ''; render(); };
ACT.qFB = () => { const r = UI.habla.r; runSpeechFB('quick', QUICK_QUESTIONS[r.qi][0], ($('#q-trans') || {}).value || ''); };

/* Técnica 4/3/2 */
const DUR = { a2: { prep: 60, r1: 120, r2: 90, r3: 60 }, orig: { prep: 60, r1: 240, r2: 180, r3: 120 } };
const ROUND_TXT = {
  prep: 'Prepara ideas, no frases completas. Escribe palabras clave para cada punto.',
  r1: 'Ronda 1: cuenta todo lo que puedas. No te detengas a corregirte.',
  r2: 'Ronda 2: la misma charla con menos tiempo. No añadas ideas nuevas: dilo con más fluidez.',
  r3: 'Ronda 3: última vez, más rápido aún. Reutiliza los mismos bloques de frases.'
};
function view432(st) {
  const s = st.t432 || (st.t432 = { card: (() => { const p = CUE_CARDS.filter(c => ctxOn().includes(c.ctx)), l = p.length ? p : CUE_CARDS; return l[dayIndex() % l.length].id; })(), phase: 'intro' });
  const card = CUE_CARDS.find(c => c.id === s.card), dur = DUR[S.settings.roundMode] || DUR.a2;
  const cardHTML = `<div class="panel stack"><p class="mono faint">Tarjeta</p><p style="font-family:var(--font-display);font-size:1.35rem;font-weight:700" lang="en">Describe ${esc(card.title.charAt(0).toLowerCase() + card.title.slice(1))}</p><p class="small muted">You should say:</p><ul style="margin:0;padding-left:18px" lang="en">${card.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
  if (s.phase === 'intro') {
    return `<div class="card lift stack-lg"><p class="prose">Vas a contar lo mismo tres veces, cada vez con menos tiempo (${dur.r1 / 60} → ${dur.r2 / 60} → ${dur.r3 / 60} min). Al repetir, tu cerebro ya no busca qué decir y se concentra en cómo decirlo: así se automatizan los bloques de frases.</p>
      <div class="row">${CUE_CARDS.map(c => `<button class="chip" aria-pressed="${c.id === s.card}" data-act="t4Card" data-id="${c.id}">${esc(c.title)}</button>`).join('')}</div>
      ${cardHTML}
      <div class="row"><button class="btn btn-primary btn-lg" data-act="t4Go" data-p="prep">Empezar preparación (1 min)</button><div class="seg"><button aria-pressed="${S.settings.roundMode !== 'orig'}" data-act="t4Mode" data-m="a2">2 · 1,5 · 1 min (A2)</button><button aria-pressed="${S.settings.roundMode === 'orig'}" data-act="t4Mode" data-m="orig">4 · 3 · 2 min</button></div></div></div>`;
  }
  if (s.phase === 'done') {
    return `<div class="card lift stack-lg"><h2>Tres rondas completadas</h2><p class="prose">Compara la primera ronda con la tercera: probablemente hiciste menos pausas y repetiste los mismos bloques con más soltura. Eso es fluidez.</p>
      ${cardHTML}
      <div class="stack"><p class="small"><b>Opcional:</b> cuenta la historia una última vez dictándola, para que el tutor la revise.</p>${dictField('t4-trans', 'Tu charla en inglés', kept('t4-trans'))}
      ${AI.ok() ? `<div class="row"><button class="btn btn-sm" data-act="t4FB">${ICON.spark} Revisar con IA</button></div>${fbHTML('t432')}` : AI_OFF_NOTE()}</div>
      <div class="row"><button class="btn btn-primary" data-act="goHome">Volver al plan</button><button class="btn" data-act="t4Again">Otra tarjeta</button></div></div>`;
  }
  const secs = dur[s.phase], label = { prep: 'Preparación', r1: 'Ronda 1', r2: 'Ronda 2', r3: 'Ronda 3' }[s.phase];
  const nextP = { prep: 'r1', r1: 'r2', r2: 'r3', r3: 'done' }[s.phase];
  const running = s.end && s.end > Date.now();
  return `<div class="card lift stack-lg">
    <div class="row-between"><span class="mono faint">${label}</span><div class="dots">${['prep', 'r1', 'r2', 'r3'].map(p => `<i class="${p === s.phase ? 'cur' : ['prep', 'r1', 'r2', 'r3'].indexOf(p) < ['prep', 'r1', 'r2', 'r3'].indexOf(s.phase) ? 'ok' : ''}"></i>`).join('')}</div></div>
    <p class="prose">${esc(ROUND_TXT[s.phase])}</p>
    <div class="timer" id="t4timer">${fmtClock(running ? s.end - Date.now() : secs * 1000)}</div>
    ${cardHTML}
    ${s.phase === 'prep' ? `<div class="field"><label for="notes432">Palabras clave</label><textarea id="notes432" class="textarea" style="min-height:90px" data-input="keep" lang="en">${esc(kept('notes432'))}</textarea></div>` : (kept('notes432') ? `<p class="small muted">Tus notas: <span lang="en">${esc(kept('notes432'))}</span></p>` : '')}
    <div class="row">${running ? `<button class="btn" data-act="t4Go" data-p="${nextP}">Terminé antes ${ICON.next}</button>` : (s.ended ? `<button class="btn btn-primary btn-lg" data-act="t4Go" data-p="${nextP}">${nextP === 'done' ? 'Terminar' : 'Siguiente: ' + { r1: 'ronda 1', r2: 'ronda 2', r3: 'ronda 3' }[nextP]} ${ICON.next}</button>` : `<button class="btn btn-primary btn-lg" data-act="t4Run">${ICON.play} Iniciar ${label.toLowerCase()}</button>`)}</div>
    ${s.phase !== 'prep' ? recorder('rec-' + s.phase) : ''}
  </div>`;
}
ACT.t4Card = el => { UI.habla.t432 = { card: el.dataset.id, phase: 'intro' }; render(); };
ACT.t4Mode = el => { S.settings.roundMode = el.dataset.m; commit(); render(); };
ACT.t4Go = el => {
  stopTimers(); const s = UI.habla.t432; s.phase = el.dataset.p; s.end = null; s.ended = false;
  if (s.phase === 'done') { S.speaking.n++; S.speaking.log.push({ d: dkey(), type: '432', id: s.card }); commit(); autoStep('habla'); render(); return; }
  render(); ACT.t4Run();
};
ACT.t4Run = () => {
  const s = UI.habla.t432, dur = DUR[S.settings.roundMode] || DUR.a2;
  s.end = Date.now() + dur[s.phase] * 1000; s.ended = false; render();
  countdown('#t4timer', s.end, () => { chime(); s.ended = true; s.end = null; render(); });
};
ACT.t4Again = () => { delete FB.t432; KEEP['t4-trans'] = ''; KEEP.notes432 = ''; UI.habla.t432 = { card: CUE_CARDS[(CUE_CARDS.findIndex(c => c.id === UI.habla.t432.card) + 1) % CUE_CARDS.length].id, phase: 'intro' }; render(); };
ACT.t4FB = () => { const s = UI.habla.t432, card = CUE_CARDS.find(c => c.id === s.card); runSpeechFB('t432', 'Describe ' + card.title + ' (' + card.points.join('; ') + ')', ($('#t4-trans') || {}).value || ''); };

/* Conversación con IA */
function rpRules(sc) {
  return `You are role-playing to help an English learner practise speaking. ${learner()}
Scenario: you are ${sc.ai}. The learner is ${sc.user}.
Rules:
- Stay in character. Use simple, natural English for level ${S.level}: short sentences and common words. 1-3 sentences per reply, and usually end with a question that keeps the conversation going.
- If the learner writes in Spanish or mixes languages, reply in English and show them how to say it in English.
- Look only at the learner's LAST message. If it has an important error (grammar, word choice, or something unclear), give exactly one correction. Ignore punctuation, capitalization and small typos: the text may come from voice dictation.
- Reply with ONLY a JSON object: {"reply": "your in-character message", "correction": null or {"yours": "the learner's phrase with the error", "better": "a corrected natural version", "note": "very short explanation in Spanish"}, "tip": "a short useful phrase in English the learner could use next, or an empty string"}`;
}
function newChat(id) {
  const sc = ROLEPLAYS.find(r => r.id === id);
  return { sc: id, turns: [{ role: 'user', content: rpRules(sc) + '\n\nStart the conversation now.' }, { role: 'assistant', content: JSON.stringify({ reply: sc.opener, correction: null, tip: '' }) }], view: [{ k: 'ai', text: sc.opener }], busy: false, n: 0 };
}
function chatView(st) {
  if (!AI.ok()) return `<div class="card stack"><h3>Conversación con IA</h3><p class="prose">Practica situaciones reales (farmacia, entrevista, examen oral) con un compañero que corrige un error importante por turno.</p>${AI_OFF_NOTE()}<p class="small muted">Mientras tanto, usa Preguntas rápidas o la técnica 4/3/2.</p></div>`;
  const c = st.chat;
  if (!c) return `<p class="small muted" style="margin-bottom:10px">Elige una situación. Escribe o dicta tus respuestas en inglés; el tutor corrige un error importante por turno.</p>
    ${groupByCtx(ROLEPLAYS, (k, items) => `<h3 style="margin:16px 0 8px">${esc(CTX[k])}</h3><div class="list">${items.map(r => `<button class="list-btn" data-act="chatOpen" data-id="${r.id}"><span class="grow"><b>${esc(r.title)}</b><span class="small muted" style="display:block">${esc(r.goal)}</span></span>${ICON.next}</button>`).join('')}</div>`)}`;
  const sc = ROLEPLAYS.find(r => r.id === c.sc);
  return `<button class="back" data-act="chatClose">${ICON.back} Otras situaciones</button>
    <div class="card lift stack" style="margin-top:10px"><div class="row-between"><h3>${esc(sc.title)}</h3><span class="chip pine">${ICON.spark} IA</span></div><p class="small muted">${esc(sc.goal)}</p></div>
    <div class="chat" style="margin:16px 0">${c.view.map(v => v.k === 'ai' ? `<div class="bubble ai"><div class="row" style="flex-wrap:nowrap;align-items:flex-start">${playBtn(v.text)}<span class="grow" lang="en">${esc(v.text)}</span></div></div>`
      : v.k === 'me' ? `<div class="bubble me" lang="en">${esc(v.text)}</div>`
      : v.k === 'fix' ? `<div class="fix"><span class="wrong" lang="en">${esc(v.yours)}</span> → <b lang="en">${esc(v.better)}</b>${v.note ? `<br><span class="muted">${esc(v.note)}</span>` : ''}</div>`
      : v.k === 'tip' ? `<div class="tip">Podrías decir: <span lang="en">«${esc(v.text)}»</span></div>`
      : `<p class="feedback no">${esc(v.text)}</p>`).join('')}
      ${c.busy ? '<div class="bubble ai"><span class="thinking"><i></i><i></i><i></i></span></div>' : ''}</div>
    ${c.summary ? summaryHTML(c) : `${dictField('chat-in', 'Tu respuesta en inglés', kept('chat-in'))}
    <div class="row" style="margin-top:8px"><button class="btn btn-primary" data-act="chatSend" ${c.busy ? 'disabled' : ''}>Enviar</button>${c.n >= 3 ? `<button class="btn" data-act="chatSum" ${c.busy ? 'disabled' : ''}>Terminar y ver resumen</button>` : `<span class="small faint">Tras 3 respuestas podrás pedir un resumen con tus errores.</span>`}</div>`}`;
}
ACT.chatOpen = el => { UI.habla.chat = newChat(el.dataset.id); render(); if (S.settings.autoplay) TTS.speak(UI.habla.chat.view[0].text); };
ACT.chatClose = () => { TTS.stop(); UI.habla.chat = null; render(); };
ACT.chatSend = async () => {
  const c = UI.habla.chat, ta = $('#chat-in'), text = ((ta && ta.value) || '').trim();
  if (!text || c.busy) { if (!text) toast('Escribe o dicta tu respuesta.'); return; }
  KEEP['chat-in'] = '';
  c.view.push({ k: 'me', text: text.slice(0, 1500) }); c.turns.push({ role: 'user', content: text.slice(0, 1500) }); c.busy = true; render();
  const input = [c.turns[0]].concat(c.turns.slice(1).slice(-16));
  try {
    const r = await AI.fn.json(input, { modelTier: 'quick', cache: false });
    const reply = String((r && r.reply) || '').trim() || 'Sorry, could you say that again?';
    c.turns.push({ role: 'assistant', content: JSON.stringify(r) });
    const cor = r && r.correction;
    if (cor && cor.better) c.view.push({ k: 'fix', yours: cor.yours || '', better: cor.better, note: cor.note || '' });
    c.view.push({ k: 'ai', text: reply });
    if (r && r.tip) c.view.push({ k: 'tip', text: String(r.tip) });
    c.n++; const t = today(); t.turns = (t.turns || 0) + 1; commit();
    if (c.n >= 6) autoStep('habla');
    if (S.settings.autoplay) TTS.speak(reply);
  } catch (e) { c.view.push({ k: 'err', text: AI.fail(e) }); }
  c.busy = false; render();
  const inp = $('#chat-in'); if (inp && matchMedia('(pointer:fine)').matches) inp.focus();
};
ACT.chatSum = async () => {
  const c = UI.habla.chat, sc = ROLEPLAYS.find(r => r.id === c.sc);
  const convo = c.view.filter(v => v.k === 'ai' || v.k === 'me').map(v => (v.k === 'me' ? 'Learner: ' : 'Partner: ') + v.text).join('\n');
  c.busy = true; render();
  try {
    c.summary = await AI.fn.json(`${learner()}
Below is a role-play conversation (${sc.title}) between the learner and a partner. Give feedback on the LEARNER's messages only.
Reply with ONLY a JSON object: {"fortalezas": "1-2 sentences in Spanish", "errores": [{"original": "...", "mejor": "...", "explicacion": "short, in Spanish"}], "vocabulario": [{"en": "useful word or phrase for this situation", "es": "Spanish translation"}], "siguiente": "one concrete recommendation in Spanish"}
At most 4 errors (the most important or recurring) and 4-6 vocabulary items the learner could have used.
Conversation:
${convo.slice(-6000)}`, { modelTier: 'default' });
    S.speaking.n++; S.speaking.log.push({ d: dkey(), type: 'ia', id: c.sc }); commit(); autoStep('habla');
  } catch (e) { c.view.push({ k: 'err', text: AI.fail(e) }); }
  c.busy = false; render();
};
function summaryHTML(c) {
  const s = c.summary || {}, errs = Array.isArray(s.errores) ? s.errores : [], voc = Array.isArray(s.vocabulario) ? s.vocabulario : [];
  return `<div class="card lift stack-lg"><h3>Resumen de la conversación</h3>
    ${s.fortalezas ? `<p class="note pine">${esc(s.fortalezas)}</p>` : ''}
    ${errs.length ? `<div class="stack"><p class="mono faint">Para corregir</p>${errs.map(e => `<div class="panel wrongright"><span class="wrong" lang="en">${esc(e.original)}</span><span class="right" lang="en">${esc(e.mejor)}</span><span class="small muted">${esc(e.explicacion)}</span></div>`).join('')}</div>` : ''}
    ${voc.length ? `<div class="stack"><p class="mono faint">Vocabulario útil</p><div class="list">${voc.map((v, i) => `<div class="row" style="flex-wrap:nowrap">${playBtn(v.en)}<div class="grow"><b lang="en">${esc(v.en)}</b><div class="small muted">${esc(v.es)}</div></div><button class="btn btn-sm" data-act="addVoc" data-i="${i}">${ICON.plus} Al repaso</button></div>`).join('')}</div></div>` : ''}
    ${s.siguiente ? `<p class="small"><b>Siguiente paso:</b> ${esc(s.siguiente)}</p>` : ''}
    <div class="row"><button class="btn btn-primary" data-act="goHome">Volver al plan</button><button class="btn" data-act="chatClose">Otra situación</button></div></div>`;
}
ACT.addVoc = el => { const v = UI.habla.chat.summary.vocabulario[Number(el.dataset.i)]; if (v && addCustom(String(v.en), String(v.es))) { toast('Añadida a tu repaso.'); el.disabled = true; } else toast('Ya está en tu mazo.'); };
addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey && ev.target && ev.target.id === 'chat-in' && matchMedia('(pointer:fine)').matches) { ev.preventDefault(); ACT.chatSend(); } });

/* Leer en voz alta + dictado */
function vozView(st) {
  const v = st.voz || (st.voz = { i: Math.floor(Math.random() * READ_ALOUD.length), res: null });
  const [sent, focus] = READ_ALOUD[v.i];
  return `<div class="card lift stack-lg">
    <p class="prose">Lee la frase en voz alta usando el dictado. Si el reconocedor escribe otra palabra, es una pista de que esa palabra no se entendió. Tómalo como pista, no como sentencia: el reconocedor también se equivoca.</p>
    <div class="row" style="gap:12px;flex-wrap:nowrap;align-items:flex-start">${playBtn(sent)}<p class="grow" style="font-family:var(--font-display);font-size:1.4rem;font-weight:700;line-height:1.3" lang="en">${esc(sent)}</p></div>
    <p class="small muted">Fíjate en: <span class="ipa">${esc(focus)}</span></p>
    ${dictField('voz-in', 'Lo que reconoció el dictado', kept('voz-in'))}
    <div class="row"><button class="btn btn-primary" data-act="vozCheck">Comparar</button><button class="btn" data-act="vozNext">Otra frase ${ICON.next}</button></div>
    ${v.res ? `<div class="stack">${diffHTML(v.res)}<p class="feedback ${v.res.score >= 0.9 ? 'ok' : 'warn'}">${Math.round(v.res.score * 100)}% de las palabras reconocidas. ${v.res.missed.length ? `Practica: <b lang="en">${esc(v.res.missed.join(', '))}</b>. Escúchalas en el modelo y repite.` : 'El reconocedor entendió todo.'}</p></div>` : ''}
    ${recorder('voz-rec')}
  </div>`;
}
ACT.vozCheck = () => { const v = UI.habla.voz, said = ($('#voz-in') || {}).value || ''; if (!said.trim()) { toast('Primero dicta la frase.'); return; } v.res = wdiff(READ_ALOUD[v.i][0], said); render(); };
ACT.vozNext = () => { const v = UI.habla.voz; let i; do { i = Math.floor(Math.random() * READ_ALOUD.length); } while (i === v.i); UI.habla.voz = { i, res: null }; KEEP['voz-in'] = ''; render(); };
