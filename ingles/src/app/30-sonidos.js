/* ================= Sonidos: HVPT, acento, terminaciones ================= */
const HVPT_N = 20;
function newHvptRun(setId) {
  const set = HVPT_SETS.find(s => s.id === setId);
  const trials = [];
  for (let i = 0; i < HVPT_N; i++) { const p = set.pairs[i % set.pairs.length]; trials.push({ pair: p, side: Math.random() < 0.5 ? 0 : 1 }); }
  return { trials: shuffle(trials), i: 0, ok: 0, ans: null, results: [] };
}
function hvptAcc(id) { const h = S.hvpt[id]; if (!h || !h.last || !h.last.length) return null; return Math.round(100 * h.last.reduce((a, b) => a + b, 0) / h.last.length); }

VIEWS.sonidos = () => {
  const st = UI.sonidos || (UI.sonidos = { tab: 'hvpt' });
  const tabs = [['hvpt', 'Pares mínimos'], ['stress', 'Acento de palabra'], ['ends', 'Terminaciones'], ['clusters', 'S- inicial']];
  let h = `<section class="head" style="margin-bottom:16px"><p class="mono eyebrow">Percepción y pronunciación</p><h1>Sonidos</h1>
    <p class="lede">Primero aprende a oír la diferencia; producirla viene después y mejora por arrastre.</p></section>
    <div class="seg" role="group" aria-label="Sección" style="margin-bottom:16px">${tabs.map(([k, l]) => `<button aria-pressed="${st.tab === k}" data-act="sonTab" data-tab="${k}">${l}</button>`).join('')}</div>`;
  if (!TTS.ok || !TTS.voices.length) h += `<p class="note bad" style="margin-bottom:14px">${TTS.ok ? 'Todavía no aparecen voces en inglés en tu dispositivo. Espera unos segundos o instala una voz en inglés (Android: Ajustes › Idioma › Texto a voz; iPhone: Ajustes › Accesibilidad › Contenido leído › Voces).' : 'Tu navegador no tiene síntesis de voz: esta sección necesita audio.'}</p>`;
  if (st.tab === 'hvpt') h += st.set ? hvptRunView(st) : hvptList();
  else if (st.tab === 'stress') h += stressView(st);
  else if (st.tab === 'ends') h += endsView(st);
  else h += clustersView();
  return h;
};
ACT.sonTab = el => { UI.sonidos = { tab: el.dataset.tab }; TTS.stop(); render(); };

function hvptList() {
  return `<p class="small muted" style="margin-bottom:12px">Ordenados por prioridad para hispanohablantes. Cada ensayo usa una voz al azar entre las ${TTS.voices.length || 'disponibles'} voces en inglés de tu dispositivo.</p>
  <div class="grid-2">${HVPT_SETS.map(s => { const a = hvptAcc(s.id); return `<div class="card stack" style="gap:10px">
    <div class="row-between"><b style="font-family:var(--font-display);font-size:1.15rem"><span class="ipa">${esc(s.a)}</span> · <span class="ipa">${esc(s.b)}</span></b><span class="chip ${s.prio === 'Alta' ? 'amber' : ''}">Prioridad ${s.prio.toLowerCase()}</span></div>
    <p class="small muted" lang="en">${esc(s.name)}</p>
    <div class="stack" style="gap:4px"><div class="row-between small"><span class="faint">Últimos ensayos</span><span class="tnum">${a === null ? '—' : a + '%'}</span></div><div class="bar amber"><i style="width:${a || 0}%"></i></div></div>
    <button class="btn btn-sm" data-act="hvptOpen" data-set="${s.id}">Entrenar</button></div>`; }).join('')}</div>`;
}
ACT.hvptOpen = el => { UI.sonidos = { tab: 'hvpt', set: el.dataset.set, run: newHvptRun(el.dataset.set) }; render(); playTrial(); };
function hvptRunView(st) {
  const set = HVPT_SETS.find(s => s.id === st.set), run = st.run;
  const head = `<button class="back" data-act="sonTab" data-tab="hvpt">${ICON.back} Todos los contrastes</button>
    <div class="card stack" style="margin:10px 0 14px"><div class="row-between"><h2><span class="ipa">${esc(set.a)}</span> frente a <span class="ipa">${esc(set.b)}</span></h2><span class="chip">Prioridad ${set.prio.toLowerCase()}</span></div>
    <details><summary style="cursor:pointer;font-weight:700">Por qué te cuesta y cómo se articula</summary><div class="prose small" style="margin-top:8px"><p>${esc(set.why)}</p><p>${esc(set.how)}</p></div></details></div>`;
  if (run.i >= run.trials.length) {
    const score = pct(run.ok, run.trials.length);
    autoStep('sonidos');
    return head + `<div class="card lift stack" style="align-items:center;text-align:center;padding:30px 18px"><p class="mono faint">Bloque terminado</p><div class="timer">${score}%</div>
      <p class="muted">${run.ok} de ${run.trials.length} correctos. ${score >= 90 ? 'Excelente: tu oído ya distingue este contraste. Pasa a otro.' : score >= 70 ? 'Vas bien: un par de bloques más y quedará firme.' : 'Normal al principio: el oído necesita cientos de ensayos. Repite otro bloque mañana.'}</p>
      <div class="row" style="justify-content:center"><button class="btn btn-primary" data-act="hvptOpen" data-set="${set.id}">Otro bloque</button><button class="btn" data-act="sonTab" data-tab="hvpt">Otro contraste</button></div></div>`;
  }
  const tr = run.trials[run.i], ans = run.ans;
  return head + `<div class="card lift stack-lg">
    <div class="row-between"><span class="mono faint">Ensayo ${run.i + 1} de ${run.trials.length}</span><div class="dots">${run.trials.map((_, k) => `<i class="${k < run.i ? (run.results[k] ? 'ok' : 'no') : k === run.i ? 'cur' : ''}"></i>`).join('')}</div></div>
    <button class="btn btn-lg btn-block" data-act="hvptPlay">${ICON.play} Escuchar de nuevo</button>
    <p class="small muted" style="text-align:center">¿Qué palabra oíste?</p>
    <div class="pair">${tr.pair.map((w, k) => `<button class="opt ${ans !== null ? (k === tr.side ? 'ok' : k === ans ? 'no' : '') : ''}" data-act="hvptAns" data-k="${k}" ${ans !== null ? 'disabled' : ''}><b lang="en">${esc(w)}</b><span class="ipa small faint">${k === 0 ? esc(set.a) : esc(set.b)}</span></button>`).join('')}</div>
    ${ans !== null ? `<div class="feedback ${ans === tr.side ? 'ok' : 'no'}">${ans === tr.side ? 'Correcto.' : `Era <b lang="en">${esc(tr.pair[tr.side])}</b>.`}</div>
      <div class="row"><button class="btn" data-act="hvptBoth">${ICON.play} Escuchar las dos</button><button class="btn btn-primary grow" data-act="hvptNext">Siguiente ${ICON.next}</button></div>` : ''}
  </div>`;
}
function playTrial() {
  const st = UI.sonidos; if (!st || !st.run) return; const run = st.run; if (run.i >= run.trials.length) return;
  const tr = run.trials[run.i];
  if (!tr.voice) { const v = TTS.random(); tr.voiceName = v ? v.name : ''; tr.rate = +(0.8 + Math.random() * 0.25).toFixed(2); tr.voice = true; }
  const voice = TTS.voices.find(v => v.name === tr.voiceName) || TTS.main();
  setTimeout(() => TTS.speak(tr.pair[tr.side], { voice, rate: tr.rate }), 120);
}
ACT.hvptPlay = () => playTrial();
ACT.hvptAns = el => {
  const st = UI.sonidos, run = st.run, k = Number(el.dataset.k), tr = run.trials[run.i];
  run.ans = k; const ok = k === tr.side ? 1 : 0; run.results[run.i] = ok; run.ok += ok;
  const h = S.hvpt[st.set] || (S.hvpt[st.set] = { n: 0, ok: 0, last: [] });
  h.n++; h.ok += ok; h.last = (h.last || []).concat(ok).slice(-30); commit();
  render();
};
ACT.hvptBoth = async () => {
  const tr = UI.sonidos.run.trials[UI.sonidos.run.i]; const voice = TTS.voices.find(v => v.name === tr.voiceName) || TTS.main();
  const my = ++TTS.token; await TTS.speak(tr.pair[0], { voice, rate: tr.rate }); if (my !== TTS.token) return; await sleep(350); if (my !== TTS.token) return; TTS.speak(tr.pair[1], { voice, rate: tr.rate });
};
ACT.hvptNext = () => { const run = UI.sonidos.run; run.i++; run.ans = null; render(); playTrial(); };

/* Acento de palabra */
function stressView(st) {
  if (!st.stress) st.stress = { n: 0, ok: 0, w: pick(STRESS_WORDS), ans: null };
  const s = st.stress, [word, syl, idx] = s.w, parts = syl.split('·');
  return `<div class="card lift stack-lg">
    <div class="row-between"><span class="mono faint">Palabra ${s.n + 1} · ${s.ok} correctas</span><span class="small muted">¿Qué sílaba suena más fuerte?</span></div>
    <div class="row" style="gap:12px"><span class="term" style="font-family:var(--font-display);font-size:2rem;font-weight:800" lang="en">${esc(word)}</span>${playBtn(word)}</div>
    <div class="tokens">${parts.map((p, k) => `<button class="token ${s.ans !== null ? (k === idx ? 'ok' : k === s.ans ? 'no' : '') : ''}" data-act="stressAns" data-k="${k}" ${s.ans !== null ? 'disabled' : ''} lang="en">${esc(s.ans !== null && k === idx ? p.toUpperCase() : p)}</button>`).join('')}</div>
    ${s.ans !== null ? `<div class="feedback ${s.ans === idx ? 'ok' : 'no'}">${s.ans === idx ? 'Correcto.' : 'No es esa.'} <b lang="en">${esc(parts.map((p, k) => k === idx ? p.toUpperCase() : p).join('·'))}</b></div><button class="btn btn-primary" data-act="stressNext">Siguiente ${ICON.next}</button>` : ''}
  </div>
  <div class="card stack" style="margin-top:16px"><h3>Reglas que sí sirven</h3><ul class="prose small" style="margin:0;padding-left:18px">${STRESS_RULES.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
}
ACT.stressAns = el => { const s = UI.sonidos.stress, k = Number(el.dataset.k), ok = k === s.w[2]; s.ans = k; s.ok += ok ? 1 : 0; S.drills.stress.n++; if (ok) S.drills.stress.ok++; commit(); render(); TTS.speak(s.w[0]); };
ACT.stressNext = () => { const s = UI.sonidos.stress; s.n++; s.ans = null; let w; do { w = pick(STRESS_WORDS); } while (w === s.w); s.w = w; render(); TTS.speak(w[0]); };

/* Terminaciones -ed y -s */
function endsView(st) {
  if (!st.ends) st.ends = { mode: 'ed', w: pick(ED_WORDS), ans: null, n: 0, ok: 0 };
  const e = st.ends, opts = e.mode === 'ed' ? [['t', '/t/'], ['d', '/d/'], ['id', '/ɪd/']] : [['s', '/s/'], ['z', '/z/'], ['iz', '/ɪz/']];
  return `<div class="seg" style="margin-bottom:12px"><button aria-pressed="${e.mode === 'ed'}" data-act="endsMode" data-m="ed">Pasado -ed</button><button aria-pressed="${e.mode === 's'}" data-act="endsMode" data-m="s">Plural y 3.ª persona -s</button></div>
  <div class="card lift stack-lg">
    <div class="row-between"><span class="mono faint">${e.ok} de ${e.n} correctas</span><span class="small muted">¿Cómo suena la terminación?</span></div>
    <div class="row" style="gap:12px"><span style="font-family:var(--font-display);font-size:2rem;font-weight:800" lang="en">${esc(e.w[0])}</span>${playBtn(e.w[0])}</div>
    <div class="grid-3">${opts.map(([k, l]) => `<button class="opt ${e.ans !== null ? (k === e.w[1] ? 'ok' : k === e.ans ? 'no' : '') : ''}" data-act="endsAns" data-k="${k}" ${e.ans !== null ? 'disabled' : ''} style="justify-content:center"><span class="ipa" style="font-size:1.3rem">${l}</span></button>`).join('')}</div>
    ${e.ans !== null ? `<div class="feedback ${e.ans === e.w[1] ? 'ok' : 'no'}">${esc(e.mode === 'ed' ? ED_RULE : S_RULE)}</div><button class="btn btn-primary" data-act="endsNext">Siguiente ${ICON.next}</button>` : ''}
  </div>`;
}
ACT.endsMode = el => { const m = el.dataset.m; UI.sonidos.ends = { mode: m, w: pick(m === 'ed' ? ED_WORDS : S_WORDS), ans: null, n: 0, ok: 0 }; render(); };
ACT.endsAns = el => { const e = UI.sonidos.ends, ok = el.dataset.k === e.w[1], key = e.mode === 'ed' ? 'ed' : 's'; e.ans = el.dataset.k; e.n++; if (ok) e.ok++; S.drills[key].n++; if (ok) S.drills[key].ok++; commit(); render(); TTS.speak(e.w[0]); };
ACT.endsNext = () => { const e = UI.sonidos.ends, list = e.mode === 'ed' ? ED_WORDS : S_WORDS; let w; do { w = pick(list); } while (w === e.w); e.w = w; e.ans = null; render(); TTS.speak(w[0]); };

function clustersView() {
  return `<div class="card stack"><p class="prose">El español no permite empezar una palabra con s + consonante, por eso decimos «espeak» o «estudent». En inglés la palabra empieza directamente con la /s/: alárgala un poco («sss-tudent») y luego sigue sin vocal.</p>
  <p class="small muted">Escucha, repite tres veces cada una y luego compruébalo con el dictado en Habla › Leer en voz alta.</p></div>
  <div class="list" style="margin-top:14px">${S_CLUSTERS.map(w => `<div class="row" style="flex-wrap:nowrap">${playBtn(w)}<b class="grow" lang="en">${esc(w)}</b><span class="small faint">no «e${esc(w)}»</span></div>`).join('')}</div>`;
}
