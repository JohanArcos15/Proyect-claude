/* ================= Escucha ================= */
const L_STEPS = ['Escuchar', 'Comprender', 'Dictado', 'Transcripción', 'Shadowing'];
function speakerOpts(spk) {
  const a = TTS.main(), b = TTS.second();
  if (spk === 'A') return { voice: a };
  return { voice: b, pitch: b === a ? 1.18 : 1 };
}
function setCur(i) {
  $$('.line').forEach(el => el.classList.toggle('cur', Number(el.dataset.i) === i));
  const cur = $(`.line[data-i="${i}"]`); if (cur && UI.escucha && UI.escucha.step === 4) cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
async function playDialogue(d, opts = {}) {
  const my = ++TTS.token;
  for (let i = opts.from || 0; i < d.lines.length; i++) {
    if (my !== TTS.token) return;
    setCur(i);
    const [spk, text] = d.lines[i];
    await TTS.speak(text, speakerOpts(spk));
    if (my !== TTS.token) return;
    await sleep(opts.shadow ? Math.round(estSec(text) * 1100) + 700 : 380);
  }
  if (my !== TTS.token) return;
  setCur(-1);
  if (opts.shadow) {
    const rec = S.listening[d.id] || (S.listening[d.id] = {});
    rec.shadow = Date.now(); rec.done = rec.done || Date.now(); commit();
    autoStep('escucha'); toast('Shadowing completo. Repetir mañana el mismo diálogo también cuenta.');
  }
}

VIEWS.escucha = () => {
  const st = UI.escucha || (UI.escucha = {});
  if (st.dose) return doseView(st.dose);
  if (st.id) return dialogueView(st);
  return `<section class="head" style="margin-bottom:18px"><p class="mono eyebrow">Comprensión auditiva</p><h1>Escucha</h1>
    <p class="lede">Cada diálogo sigue cinco pasos: del significado general al detalle del sonido.</p></section>
    <div class="card lift row" style="flex-wrap:nowrap;align-items:flex-start;margin-bottom:16px"><span class="icon-btn" aria-hidden="true">${ICON.escucha}</span>
      <div class="grow stack" style="gap:6px"><b style="font-family:var(--font-display);font-size:1.15rem">Entrenador de dosis</b><p class="small muted">Escucha una indicación («Take fifteen milligrams every eight hours») y anota dosis, unidad y frecuencia. Entrena fifteen/fifty, decimales y unidades.</p>
      <div><button class="btn btn-sm btn-primary" data-act="doseStart">Empezar 10 indicaciones</button></div></div></div>
    <div class="list">${DIALOGUES.map(d => { const r = S.listening[d.id]; return `<button class="list-btn" data-act="openDialogue" data-id="${d.id}">
      <span class="grow"><b lang="en">${esc(d.title)}</b><span class="small muted" style="display:block">${esc(d.topic)} · ${d.lines.length} líneas</span></span>
      <span class="row" style="flex-wrap:nowrap"><span class="chip">${esc(d.level)}</span>${r ? `<span class="chip good">${r.score != null ? r.score + '%' : 'Hecho'}</span>` : ''}</span></button>`; }).join('')}</div>`;
};
ACT.openDialogue = el => { UI.escucha = { id: el.dataset.id, step: 0 }; render(); };
ACT.lBack = () => { TTS.stop(); UI.escucha = {}; render(); };
ACT.lStep = el => { TTS.stop(); UI.escucha.step = Number(el.dataset.s); render(); window.scrollTo(0, 0); };
ACT.lPlay = () => { const d = DIALOGUES.find(x => x.id === UI.escucha.id); playDialogue(d); };
ACT.lStop = () => { TTS.stop(); setCur(-1); };
ACT.lLine = el => { const d = DIALOGUES.find(x => x.id === UI.escucha.id), i = Number(el.dataset.i); TTS.token++; setCur(i); TTS.speak(d.lines[i][1], Object.assign(speakerOpts(d.lines[i][0]), el.dataset.slow ? { rate: 0.7 } : {})).then(() => setCur(-1)); };
ACT.lShadow = () => { const d = DIALOGUES.find(x => x.id === UI.escucha.id); playDialogue(d, { shadow: true }); };
ACT.lHide = () => { UI.escucha.hide = !UI.escucha.hide; render(); };
ACT.setRate = el => { S.settings.rate = Number(el.dataset.r); commit(); render(); };
const rateSeg = () => `<div class="seg" role="group" aria-label="Velocidad">${[[0.7, 'Lenta'], [0.85, 'Media'], [1, 'Normal']].map(([r, l]) => `<button aria-pressed="${Math.abs(S.settings.rate - r) < 0.08}" data-act="setRate" data-r="${r}">${l}</button>`).join('')}</div>`;

function dialogueView(st) {
  const d = DIALOGUES.find(x => x.id === st.id);
  const rec = S.listening[d.id];
  let h = `<button class="back" data-act="lBack">${ICON.back} Todos los diálogos</button>
    <section class="head" style="margin:10px 0 14px"><div class="row"><span class="chip">${esc(d.level)}</span><span class="chip pine">${esc(d.topic)}</span>${rec && rec.score != null ? `<span class="chip good">Comprensión ${rec.score}%</span>` : ''}</div><h1 lang="en">${esc(d.title)}</h1></section>
    <div class="row-between" style="margin-bottom:14px"><div class="seg" role="group" aria-label="Pasos">${L_STEPS.map((l, i) => `<button aria-pressed="${st.step === i}" data-act="lStep" data-s="${i}">${i + 1}. ${l}</button>`).join('')}</div></div>
    <div class="row" style="margin-bottom:14px">${rateSeg()}</div>`;
  const nextBtn = (label) => st.step < 4 ? `<button class="btn btn-primary" data-act="lStep" data-s="${st.step + 1}">${label || 'Siguiente paso'} ${ICON.next}</button>` : '';
  if (st.step === 0) {
    h += `<div class="card lift stack-lg"><div class="stack"><h3>Antes de escuchar</h3><p class="prose">${esc(d.context)}</p></div>
      <div class="stack"><p class="mono faint">Palabras clave</p><div class="list">${d.keys.map(([en, es]) => `<div class="row" style="flex-wrap:nowrap">${playBtn(en)}<b class="grow" lang="en">${esc(en)}</b><span class="small muted">${esc(es)}</span></div>`).join('')}</div></div>
      <div class="stack"><p class="small muted">Escucha el diálogo completo sin leer. No intentes entender cada palabra: busca la idea general.</p>
      <div class="row"><button class="btn btn-lg btn-primary" data-act="lPlay">${ICON.play} Reproducir</button><button class="btn btn-lg" data-act="lStop">${ICON.stop} Detener</button></div></div>
      <div>${nextBtn('Ir a las preguntas')}</div></div>`;
  } else if (st.step === 1) {
    st.qa = st.qa || {};
    const answered = Object.keys(st.qa).length, okN = d.q.filter((q, i) => st.qa[i] === q[2]).length;
    h += `<div class="card lift stack-lg"><div class="row"><button class="btn btn-sm" data-act="lPlay">${ICON.play} Escuchar otra vez</button><button class="btn btn-sm" data-act="lStop">${ICON.stop}</button></div>
      ${d.q.map((q, i) => { const a = st.qa[i]; return `<div class="stack"><p><b>${i + 1}.</b> <span lang="en">${esc(q[0])}</span></p><div class="opts">${q[1].map((o, k) => `<button class="opt ${a !== undefined ? (k === q[2] ? 'ok' : k === a ? 'no' : '') : ''}" data-act="lAns" data-q="${i}" data-k="${k}" ${a !== undefined ? 'disabled' : ''} lang="en"><span class="k">${'ABC'[k]}</span>${esc(o)}</button>`).join('')}</div></div>`; }).join('')}
      ${answered === d.q.length ? `<p class="feedback ${okN >= 4 ? 'ok' : 'warn'}">${okN} de ${d.q.length} correctas. ${okN >= 4 ? 'Buena comprensión global.' : 'Normal en la primera escucha: el dictado y la transcripción te mostrarán qué se te escapó.'}</p>${nextBtn('Ir al dictado')}` : ''}</div>`;
  } else if (st.step === 2) {
    st.dd = st.dd || {};
    h += `<div class="card lift stack-lg"><p class="prose">Escucha cada frase las veces que necesites y escríbela completa. El dictado te obliga a percibir palabras pequeñas (a, the, -s, -ed) que en la escucha global se pierden.</p>
      ${d.dict.map((li, n) => { const r = st.dd[li]; return `<div class="stack"><div class="row"><span class="mono faint">Frase ${n + 1}</span><button class="btn btn-sm" data-act="lLine" data-i="${li}">${ICON.play} Escuchar</button><button class="btn btn-sm btn-ghost" data-act="lLine" data-i="${li}" data-slow="1">Más lento</button></div>
        <input id="dict-${li}" class="input" lang="en" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="Escribe lo que oyes" data-input="keep" value="${esc(kept('dict-' + li))}">
        <div class="row"><button class="btn btn-sm btn-primary" data-act="lDict" data-i="${li}">Comprobar</button></div>
        ${r ? `<div class="stack" style="gap:6px">${diffHTML(r)}<p class="small muted">Correcto: <span lang="en">${esc(d.lines[li][1])}</span> · ${Math.round(r.score * 100)}% de las palabras</p></div>` : ''}</div>`; }).join('<hr class="hr">')}
      <p class="small faint">Verde: acertaste. Rojo subrayado: no lo oíste o lo escribiste distinto. Amarillo: palabras de más.</p>
      <div>${nextBtn('Ver la transcripción')}</div></div>`;
  } else if (st.step === 3) {
    h += `<div class="card lift stack"><div class="row"><button class="btn btn-sm btn-primary" data-act="lPlay">${ICON.play} Reproducir todo</button><button class="btn btn-sm" data-act="lStop">${ICON.stop} Detener</button><span class="small muted">Toca una línea para oírla sola.</span></div>
      <div class="stack" style="gap:2px">${d.lines.map(([spk, t], i) => `<div class="line" data-act="lLine" data-i="${i}" role="button" tabindex="0"><span class="who">${esc(d.roles[spk] || spk)}</span><span class="txt grow" lang="en">${esc(t)}</span></div>`).join('')}</div>
      ${d.note ? `<p class="note">${esc(d.note)}</p>` : ''}<div>${nextBtn('Pasar al shadowing')}</div></div>`;
  } else {
    h += `<div class="card lift stack"><p class="prose">Shadowing: después de cada línea la app hace una pausa para que la repitas en voz alta, copiando el ritmo y la entonación. Primero con el texto; cuando te sientas seguro/a, ocúltalo.</p>
      <div class="row"><button class="btn btn-primary" data-act="lShadow">${ICON.play} Empezar shadowing</button><button class="btn" data-act="lStop">${ICON.stop} Detener</button><button class="btn btn-ghost" data-act="lHide">${st.hide ? 'Mostrar texto' : 'Ocultar texto'}</button></div>
      <div class="stack" style="gap:2px">${d.lines.map(([spk, t], i) => `<div class="line ${st.hide ? 'hide-text' : ''}" data-act="lLine" data-i="${i}" role="button" tabindex="0"><span class="who">${esc(d.roles[spk] || spk)}</span><span class="txt grow" lang="en">${esc(t)}</span></div>`).join('')}</div>
      <p class="small faint">Consejo: grábate una vez y compárate con el modelo.</p>${recorder('shadow-rec')}</div>`;
  }
  return h;
}
ACT.lAns = el => {
  const st = UI.escucha, d = DIALOGUES.find(x => x.id === st.id), i = Number(el.dataset.q);
  st.qa[i] = Number(el.dataset.k);
  if (Object.keys(st.qa).length === d.q.length) {
    const score = pct(d.q.filter((q, k) => st.qa[k] === q[2]).length, d.q.length);
    const rec = S.listening[d.id] || (S.listening[d.id] = {});
    rec.score = score; rec.done = Date.now(); rec.plays = (rec.plays || 0) + 1; commit();
  }
  render();
};
ACT.lDict = el => {
  const st = UI.escucha, d = DIALOGUES.find(x => x.id === st.id), li = Number(el.dataset.i);
  const v = ($('#dict-' + li) || {}).value || '';
  if (!v.trim()) { toast('Escribe lo que oíste primero.'); return; }
  st.dd[li] = wdiff(d.lines[li][1], v); render();
};

/* Entrenador de dosis */
function genDose() {
  const amt = pick(DOSE_AMOUNTS);
  const units = DOSE_UNITS.filter(([u]) => u === 'mg' || (u === 'mL' && amt <= 30) || (u === 'mcg' && Number.isInteger(amt) && amt >= 25 && amt <= 500) || (u === 'g' && amt <= 2.5));
  const unit = pick(units), freq = pick(DOSE_FREQS), lead = pick(['Take', 'Give the patient', 'The dose is', 'Please take']);
  return { amt, unit: unit[0], freq: freq[0], said: `${lead} ${numWords(amt)} ${amt === 1 ? unit[1].replace(/s$/, '') : unit[1]} ${freq[0]}.` };
}
ACT.doseStart = () => { UI.escucha = { dose: { i: 0, n: 10, ok: 0, item: genDose(), ans: {}, checked: null } }; render(); setTimeout(() => TTS.speak(UI.escucha.dose.item.said), 150); };
function doseView(ds) {
  const back = `<button class="back" data-act="lBack">${ICON.back} Escucha</button>`;
  if (ds.i >= ds.n) {
    return back + `<div class="card lift stack" style="align-items:center;text-align:center;margin-top:12px;padding:30px 18px"><p class="mono faint">Ronda terminada</p><div class="timer">${ds.ok}/${ds.n}</div>
      <p class="muted">${ds.ok >= 9 ? 'Excelente: números y unidades bajo control.' : 'Fíjate sobre todo en el acento: fifTEEN frente a FIFty, y en «point» para los decimales.'}</p>
      <div class="row"><button class="btn btn-primary" data-act="doseStart">Otra ronda</button><button class="btn" data-act="lBack">Volver</button></div></div>`;
  }
  const it = ds.item, c = ds.checked;
  return back + `<div class="card lift stack-lg" style="margin-top:12px">
    <div class="row-between"><span class="mono faint">Indicación ${ds.i + 1} de ${ds.n} · ${ds.ok} correctas</span>${rateSeg()}</div>
    <div class="row"><button class="btn btn-lg btn-primary" data-act="dosePlay">${ICON.play} Escuchar</button><button class="btn btn-lg" data-act="dosePlay" data-slow="1">Más lento</button></div>
    <div class="field"><label for="dose-amt">Cantidad (número)</label><input id="dose-amt" class="input ${c ? (c.amt ? 'ok' : 'no') : ''}" inputmode="decimal" autocomplete="off" placeholder="Ej.: 15 o 0.5" style="max-width:220px" value="${esc(ds.ans.amtText || '')}" data-input="doseAmt" ${c ? 'disabled' : ''}></div>
    <div class="field"><span class="small" style="font-weight:700">Unidad</span><div class="row">${DOSE_UNITS.map(([u]) => `<button class="chip ${c && u === it.unit ? 'good' : c && u === ds.ans.unit ? 'bad' : ''}" aria-pressed="${ds.ans.unit === u}" data-act="doseUnit" data-u="${u}" ${c ? 'disabled' : ''}>${u}</button>`).join('')}</div></div>
    <div class="field"><span class="small" style="font-weight:700">Frecuencia</span><div class="row">${DOSE_FREQS.map(([f, es]) => `<button class="chip ${c && f === it.freq ? 'good' : c && f === ds.ans.freq ? 'bad' : ''}" aria-pressed="${ds.ans.freq === f}" data-act="doseFreq" data-f="${esc(f)}" ${c ? 'disabled' : ''}>${esc(es)}</button>`).join('')}</div></div>
    ${c ? `<div class="feedback ${c.all ? 'ok' : 'no'}"><p>${c.all ? 'Todo correcto.' : 'Revisa lo marcado en rojo.'}</p><p class="muted">Se dijo: <span lang="en">${esc(it.said)}</span> → <b>${String(it.amt).replace('.', ',')} ${esc(it.unit)}</b></p></div>
      <div class="row"><button class="btn" data-act="dosePlay">${ICON.play} Oír otra vez</button><button class="btn btn-primary grow" data-act="doseNext">Siguiente ${ICON.next}</button></div>`
      : `<button class="btn btn-primary" data-act="doseCheck">Comprobar</button>`}
  </div>`;
}
ACT.dosePlay = el => TTS.speak(UI.escucha.dose.item.said, el.dataset.slow ? { rate: 0.65 } : {});
INP.doseAmt = el => { UI.escucha.dose.ans.amtText = el.value; };
ACT.doseUnit = el => { UI.escucha.dose.ans.unit = el.dataset.u; render(); };
ACT.doseFreq = el => { UI.escucha.dose.ans.freq = el.dataset.f; render(); };
ACT.doseCheck = () => {
  const ds = UI.escucha.dose, it = ds.item, raw = (ds.ans.amtText || '').replace(',', '.').trim();
  if (!raw || !ds.ans.unit || !ds.ans.freq) { toast('Completa cantidad, unidad y frecuencia.'); return; }
  const amt = Math.abs(parseFloat(raw) - it.amt) < 1e-9, unit = ds.ans.unit === it.unit, freq = ds.ans.freq === it.freq;
  ds.checked = { amt, unit, freq, all: amt && unit && freq };
  if (ds.checked.all) ds.ok++;
  S.drills.dose.n++; if (ds.checked.all) S.drills.dose.ok++; commit(); render();
};
ACT.doseNext = () => { const ds = UI.escucha.dose; ds.i++; ds.item = genDose(); ds.ans = {}; ds.checked = null; render(); if (ds.i < ds.n) setTimeout(() => TTS.speak(ds.item.said), 150); };
