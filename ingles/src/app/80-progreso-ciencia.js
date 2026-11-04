/* ================= Progreso ================= */
function lastDays(n) { const out = []; const d = new Date(); for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); out.push(x); } return out; }
function minutesChart() {
  const days = lastDays(14), mins = days.map(d => Math.round(((S.days[dkey(d)] || {}).sec || 0) / 60));
  const W = 560, H = 200, L = 34, R = 10, T = 14, B = 28, goal = 58;
  const max = Math.max(60, ...mins), yMax = Math.ceil(max / 15) * 15;
  const y = v => T + (H - T - B) * (1 - v / yMax), bw = (W - L - R) / days.length;
  const ticks = []; for (let v = 0; v <= yMax; v += yMax > 90 ? 30 : 15) ticks.push(v);
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Minutos de estudio en los últimos 14 días">
    ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" style="fill:var(--ink-3);font:11px var(--font-mono)">${v}</text>`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${y(goal)}" y2="${y(goal)}" style="stroke:var(--amber-fill)" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="${W - R}" y="${y(goal) - 5}" text-anchor="end" style="fill:var(--amber);font:600 11px var(--font-body)">meta ${goal} min</text>
    ${mins.map((m, i) => { const x = L + i * bw + bw * 0.18, w = bw * 0.64, isT = i === days.length - 1; return `<rect x="${x.toFixed(1)}" y="${y(m).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, y(0) - y(m)).toFixed(1)}" rx="3" style="fill:${isT ? 'var(--amber-fill)' : 'var(--pine)'}"/><text x="${(x + w / 2).toFixed(1)}" y="${H - 9}" text-anchor="middle" style="fill:var(--ink-3);font:10px var(--font-mono)">${DOW[days[i].getDay()].slice(0, 2)}</text>`; }).join('')}
  </svg></div>`;
}
function monthBlister() {
  const d = new Date(), first = new Date(d.getFullYear(), d.getMonth(), 1), daysIn = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  let cells = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(x => `<span class="mono faint" style="text-align:center">${x}</span>`).join('');
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let k = 1; k <= daysIn; k++) { const x = new Date(d.getFullYear(), d.getMonth(), k), key = dkey(x); cells += `<span style="display:flex;flex-direction:column;align-items:center;gap:2px">${capsule(key, key === dkey())}<span class="mono faint" style="font-size:.6rem">${k}</span></span>`; }
  return `<div class="month">${cells}</div>`;
}
function skillRows() {
  const max = LVL_MAX[S.level] || 2, all = allItems().filter(i => i.lvl <= max);
  const vocab = pct(all.filter(i => { const c = S.srs[i.id + ':r']; return c && c.s === 'review' && c.ivl >= 7; }).length, all.length);
  const accs = HVPT_SETS.map(s => hvptAcc(s.id)).filter(a => a !== null);
  const ear = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : 0;
  const rows = [
    ['Vocabulario estable (≥7 días)', vocab, `${vocab}% de tu nivel`],
    ['Oído: pares mínimos', ear, accs.length ? `${ear}% · ${accs.length} de ${HVPT_SETS.length} contrastes` : 'Sin datos aún'],
    ['Escucha: diálogos', pct(Object.keys(S.listening).length, DIALOGUES.length), `${Object.keys(S.listening).length} de ${DIALOGUES.length}`],
    ['Gramática: unidades', pct(Object.keys(S.grammar).length, GRAMMAR.length), `${Object.keys(S.grammar).length} de ${GRAMMAR.length}`],
    ['Lectura: textos', pct(Object.keys(S.reading).length, READINGS.length), `${Object.keys(S.reading).length} de ${READINGS.length}`],
    ['Escritura: textos', pct(Math.min(S.writing.length, 20), 20), `${S.writing.length} escritos`],
    ['Habla: sesiones', pct(Math.min(S.speaking.n, 40), 40), `${S.speaking.n} prácticas`]
  ];
  return rows.map(([l, v, t]) => `<div class="stack" style="gap:5px"><div class="row-between small"><span>${esc(l)}</span><span class="muted tnum">${esc(t)}</span></div><div class="bar"><i style="width:${v}%"></i></div></div>`).join('');
}
function roadmap() {
  const appH = Object.values(S.days).reduce((a, d) => a + (d.sec || 0), 0) / 3600;
  const base = { A1: 40, A2: 190, B1: 375, B2: 550 }[S.level] || 190;
  const total = base + appH, maxH = 800;
  const recent = lastDays(14).reduce((a, d) => a + ((S.days[dkey(d)] || {}).sec || 0), 0) / 3600 / 2;
  const weekly = recent > 0.3 ? recent : 5.5;
  const left = l => { const h = CEFR_HOURS.find(x => x[0] === l)[1]; return Math.max(0, h - total); };
  const wk = h => Math.ceil(h / weekly);
  return `<div class="stack">
    <div style="position:relative;height:46px;margin-top:6px">
      <div class="bar amber" style="position:absolute;left:0;right:0;top:14px;height:10px"><i style="width:${clamp(100 * total / maxH, 0, 100)}%"></i></div>
      ${CEFR_HOURS.map(([l, h]) => `<span style="position:absolute;left:${(100 * h / maxH).toFixed(1)}%;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:14px"><span class="mono" style="font-size:.66rem;color:var(--ink-2)">${l}</span><span class="mono faint" style="font-size:.62rem">${h} h</span></span>`).join('')}
    </div>
    <p class="small muted" style="margin-top:12px">Punto de partida estimado para ${esc(S.level)} ≈ ${base} h + <b>${appH.toFixed(1).replace('.', ',')} h</b> en la app. A tu ritmo (${weekly.toFixed(1).replace('.', ',')} h/semana), te faltarían unas <b>${wk(left('B1'))} semanas</b> para B1 y <b>${wk(left('B2'))} semanas</b> para B2.</p>
    <p class="small faint">Las horas de referencia son orientativas (horas guiadas acumuladas que propone Cambridge English). Varían mucho según la persona, la intensidad y la cantidad de inglés fuera de la app.</p>
  </div>`;
}
VIEWS.progreso = () => {
  const totalH = Object.values(S.days).reduce((a, d) => a + (d.sec || 0), 0) / 3600;
  const mature = Object.values(S.srs).filter(x => x.s === 'review' && x.ivl >= 21).length;
  const last30 = lastDays(30).map(d => S.days[dkey(d)] || {}), rev = last30.reduce((a, d) => a + (d.rev || 0), 0), ok = last30.reduce((a, d) => a + (d.ok || 0), 0);
  const st = UI.progreso || (UI.progreso = {});
  const seg = (key, opts, val) => `<div class="seg">${opts.map(([v, l]) => `<button aria-pressed="${String(val) === String(v)}" data-act="setOpt" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  return `<section class="head" style="margin-bottom:18px"><p class="mono eyebrow">Tu historial</p><h1>Progreso</h1></section>
    <div class="grid-3" style="margin-bottom:16px">
      <div class="card kv"><span class="small muted">Horas de estudio</span><b>${totalH.toFixed(1).replace('.', ',')}</b></div>
      <div class="card kv"><span class="small muted">Racha actual</span><b>${plural(streak(), 'día', 'días')}</b></div>
      <div class="card kv"><span class="small muted">Palabras maduras</span><b>${mature}</b></div>
      <div class="card kv"><span class="small muted">Recuerdo (30 días)</span><b>${rev ? pct(ok, rev) + '%' : '—'}</b></div>
    </div>
    <div class="card stack" style="margin-bottom:16px"><div class="row-between"><h3>Últimos 14 días</h3><span class="small muted">minutos de estudio activo</span></div>${minutesChart()}</div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card stack"><h3>${MONTHS[new Date().getMonth()].replace(/^./, c => c.toUpperCase())}</h3>${monthBlister()}</div>
      <div class="card stack"><h3>Habilidades</h3>${skillRows()}</div>
    </div>
    <div class="card stack" style="margin-bottom:16px"><h3>Ruta hacia B2</h3>${roadmap()}</div>
    <div class="card stack" style="margin-bottom:16px"><div class="row-between"><h3>Prueba de nivel</h3>${S.placement ? `<span class="chip pine">${esc(S.placement.level)} · ${esc(S.placement.d)}</span>` : ''}</div>
      <p class="small muted">Orientativa, no oficial. Repítela cada 4–6 semanas para ver tu avance.</p>
      <div class="row"><button class="btn" data-act="goPlacement">${S.placement ? 'Repetir la prueba' : 'Hacer la prueba'}</button><span class="small muted">Nivel actual del plan: <b>${esc(S.level)}</b></span>${seg('level', [['A1', 'A1'], ['A2', 'A2'], ['B1', 'B1']], S.level)}</div></div>
    <div class="card stack-lg" style="margin-bottom:16px"><h3>Ajustes</h3>
      <div class="stack"><span class="small" style="font-weight:700">Acento de las voces</span>${seg('accent', [['us', 'EE. UU.'], ['uk', 'Reino Unido'], ['any', 'Cualquiera']], S.settings.accent)}</div>
      <div class="stack"><span class="small" style="font-weight:700">Velocidad de la voz</span>${seg('rate', [[0.7, 'Lenta'], [0.85, 'Media'], [0.9, 'Media+'], [1, 'Normal']], S.settings.rate)}</div>
      <div class="stack"><span class="small" style="font-weight:700">Tarjetas nuevas por día</span>${seg('newPerDay', [[10, '10'], [15, '15'], [20, '20'], [25, '25']], S.settings.newPerDay)}<span class="small faint">Cada tarjeta nueva genera repasos durante semanas: 15 al día son unos 10–12 minutos diarios de repaso a medio plazo.</span></div>
      <div class="stack"><span class="small" style="font-weight:700">Reproducir audio automáticamente</span>${seg('autoplay', [['true', 'Sí'], ['false', 'No']], String(S.settings.autoplay))}</div>
      <div class="stack"><span class="small" style="font-weight:700">Voces en inglés en este dispositivo: ${TTS.voices.length}</span><p class="small muted">${TTS.voices.length ? esc(TTS.voices.slice(0, 8).map(v => v.name + ' (' + v.lang + ')').join(' · ')) : 'Ninguna detectada todavía.'}</p><p class="small faint">Más voces = más variabilidad para entrenar el oído. Puedes instalar voces en inglés en los ajustes de texto a voz de tu sistema.</p></div>
    </div>
    <div class="card stack"><h3>Tus datos</h3><p class="small muted"><span data-sync class="sync"></span></p>
      <p class="small faint">${Cloud.ref ? 'Tu progreso es privado: se guarda en tu cuenta de Claude y nadie más con acceso a esta app puede verlo.' : 'Abre la app desde Claude para guardar tu progreso en tu cuenta y usarlo en varios dispositivos.'}</p>
      <div class="row">${st.confirmReset ? `<button class="btn" style="border-color:var(--bad);color:var(--bad)" data-act="doReset">Sí, borrar todo mi progreso</button><button class="btn btn-ghost" data-act="cancelReset">Cancelar</button>` : `<button class="btn btn-ghost" style="color:var(--bad)" data-act="askReset">Reiniciar progreso</button>`}</div></div>`;
};
ACT.setOpt = el => {
  const k = el.dataset.k, v = el.dataset.v;
  if (k === 'level') { S.level = v; S.onboarded = true; delete today().plan; }
  else if (k === 'rate') S.settings.rate = Number(v);
  else if (k === 'newPerDay') S.settings.newPerDay = Number(v);
  else if (k === 'autoplay') S.settings.autoplay = v === 'true';
  else S.settings[k] = v;
  commit(); render(); if (k === 'accent' || k === 'rate') TTS.speak('This is how I sound.');
};
ACT.askReset = () => { UI.progreso.confirmReset = true; render(); };
ACT.cancelReset = () => { UI.progreso.confirmReset = false; render(); };
ACT.doReset = () => { const keepLevel = S.level; S = freshState(); S.level = keepLevel; S.onboarded = true; UI.progreso.confirmReset = false; commit(); flushCloud(); toast('Progreso reiniciado.'); render(); };

/* ================= Prueba de nivel ================= */
VIEWS.nivel = () => {
  const st = UI.nivel || (UI.nivel = { i: 0, answers: [] });
  if (st.i >= PLACEMENT.length) {
    const by = l => PLACEMENT.reduce((a, q, i) => a + (q[0] === l && st.answers[i] === q[3] ? 1 : 0), 0);
    const a1 = by('A1'), a2 = by('A2'), b1 = by('B1'), b2 = by('B2');
    let lvl = 'A1'; if (a1 >= 3 && a2 >= 3) { lvl = 'A2'; if (b1 >= 3) { lvl = 'B1'; if (b2 >= 2) lvl = 'B2'; } }
    const planLvl = lvl === 'B2' ? 'B1' : lvl;
    return `<section class="head" style="margin-bottom:16px"><p class="mono eyebrow">Resultado orientativo</p><h1>Tu nivel estimado: ${lvl}</h1></section>
      <div class="card lift stack-lg"><div class="grid-3">${[['A1', a1, 4], ['A2', a2, 5], ['B1', b1, 5], ['B2', b2, 2]].map(([l, v, n]) => `<div class="kv"><span class="small muted">${l}</span><b>${v}/${n}</b></div>`).join('')}</div>
      <p class="prose">${lvl === 'A1' ? 'Empezaremos por las bases: la app introducirá primero el vocabulario y la gramática más frecuentes.' : lvl === 'A2' ? 'Tienes las bases. El plan se centra en ampliar vocabulario, consolidar los tiempos verbales y ganar fluidez al hablar.' : 'Buen nivel. El plan dará más peso a textos académicos, la voz pasiva, los condicionales y la argumentación.'}</p>
      <p class="small faint">Una prueba corta de gramática no mide bien la expresión oral ni la escucha. Úsala como guía y ajusta el nivel cuando quieras en Progreso.</p>
      <div class="row"><button class="btn btn-primary" data-act="useLevel" data-l="${planLvl}" data-r="${lvl}">Usar nivel ${planLvl} en mi plan</button><button class="btn" data-act="goHome">Volver sin cambiar</button></div></div>`;
  }
  const q = PLACEMENT[st.i];
  return `<section class="head" style="margin-bottom:16px"><p class="mono eyebrow">Prueba de nivel · ${st.i + 1} de ${PLACEMENT.length}</p><h1>Elige la opción correcta</h1><p class="small muted">Si no lo sabes, elige «No lo sé»: adivinar distorsiona el resultado.</p></section>
    <div class="card lift stack-lg"><div class="bar"><i style="width:${pct(st.i, PLACEMENT.length)}%"></i></div>
      <p style="font-size:1.25rem" lang="en"><b>${esc(q[1])}</b></p>
      <div class="opts">${q[2].map((o, k) => `<button class="opt" data-act="plAns" data-k="${k}" lang="en"><span class="k">${'ABCD'[k]}</span>${esc(o)}</button>`).join('')}<button class="opt" data-act="plAns" data-k="-1"><span class="k">?</span>No lo sé</button></div></div>`;
};
ACT.plAns = el => { const st = UI.nivel; st.answers[st.i] = Number(el.dataset.k); st.i++; render(); window.scrollTo(0, 0); };
ACT.useLevel = el => { S.level = el.dataset.l; S.onboarded = true; S.placement = { d: dkey(), level: el.dataset.r }; delete today().plan; commit(); UI.nivel = null; toast(`Plan ajustado a ${S.level}`); go('hoy', null); };

/* ================= Ciencia ================= */
function memoryChart() {
  const W = 600, H = 260, L = 44, R = 14, T = 16, B = 34, days = 30;
  const x = t => L + (W - L - R) * t / days, y = r => T + (H - T - B) * (1 - r);
  const Rf = (t, s) => 1 / (1 + t / (9 * s));
  let none = '', spaced = '';
  for (let t = 0; t <= days; t += 0.25) none += `${t ? 'L' : 'M'}${x(t).toFixed(1)},${y(Rf(t, 1)).toFixed(1)}`;
  const reviews = [[0, 1], [1, 3], [4, 8], [12, 20]];
  reviews.forEach(([t0, s], i) => { const end = i + 1 < reviews.length ? reviews[i + 1][0] : days; for (let t = t0; t <= end + 1e-9; t += 0.25) spaced += `${i === 0 && t === t0 ? 'M' : 'L'}${x(t).toFixed(1)},${y(Rf(t - t0, s)).toFixed(1)}`; });
  const xt = [0, 5, 10, 15, 20, 25, 30], yt = [0, 0.25, 0.5, 0.75, 1];
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Probabilidad de recordar una palabra con y sin repasos espaciados durante 30 días">
    ${yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" style="fill:var(--ink-3);font:11px var(--font-mono)">${v * 100}%</text>`).join('')}
    ${xt.map(v => `<text x="${x(v)}" y="${H - 12}" text-anchor="middle" style="fill:var(--ink-3);font:11px var(--font-mono)">${v} d</text>`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${y(0.9)}" y2="${y(0.9)}" style="stroke:var(--amber-fill)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="${W - R}" y="${y(0.9) + 16}" text-anchor="end" style="fill:var(--amber);font:600 11px var(--font-body)">umbral de recuerdo (90 %)</text>
    <path d="${none}" fill="none" style="stroke:var(--ink-3)" stroke-width="2"/>
    <path d="${spaced}" fill="none" style="stroke:var(--pine)" stroke-width="2.5" stroke-linejoin="round"/>
    ${reviews.slice(1).map(([t]) => `<circle cx="${x(t)}" cy="${y(1)}" r="4.5" style="fill:var(--pine)"/><text x="${x(t)}" y="${y(1) - 8}" text-anchor="middle" style="fill:var(--pine);font:600 10px var(--font-body)">repaso</text>`).join('')}
    <text x="${x(29.5)}" y="${y(Rf(29.5, 1)) - 8}" text-anchor="end" style="fill:var(--ink-2);font:600 11px var(--font-body)">sin repasar: ${Math.round(Rf(30, 1) * 100)}%</text>
  </svg></div>
  <div class="legend"><span><i style="background:var(--pine)"></i>Con repasos en los días 1, 4 y 12</span><span><i style="background:var(--ink-3)"></i>Una sola sesión, sin repasos</span><span><i style="background:var(--amber-fill)"></i>Umbral, como una concentración mínima eficaz</span></div>`;
}
const evBadge = ev => `<span class="ev ev-${ev}">${esc(EVIDENCE_LABELS[ev])}</span>`;
VIEWS.ciencia = () => {
  const st = UI.ciencia || (UI.ciencia = { qa: {} });
  const answered = Object.keys(st.qa).length, okN = SCIENCE_QUIZ.filter((q, i) => st.qa[i] === q[2]).length;
  return `<section class="head" style="margin-bottom:18px"><p class="mono eyebrow">Por qué este plan</p><h1>La ciencia de tu dosis</h1>
    <p class="lede">Cada parte de la app aplica un principio con evidencia. Te digo cuánto respaldo tiene cada uno y dónde hay debate.</p></section>
    <div class="row" style="margin-bottom:18px">${Object.keys(EVIDENCE_LABELS).map(evBadge).join('')}</div>
    <article class="card lift stack-lg" style="margin-bottom:22px">
      <div class="head"><p class="mono eyebrow">La idea central</p><h2>Tu memoria tiene farmacocinética</h2></div>
      <p class="prose">Piensa en una palabra nueva como en un fármaco recién administrado: su «concentración» en tu memoria (la probabilidad de recordarla) empieza alta y cae con el tiempo. Un repaso es una nueva dosis que la sube otra vez. Con un régimen bien espaciado, la concentración se mantiene por encima del umbral, igual que mantienes un fármaco por encima de la concentración mínima eficaz.</p>
      ${memoryChart()}
      <div class="note"><b>Dónde se rompe la analogía.</b> La vida media de un fármaco con cinética lineal es (casi) constante: por eso se dosifica a intervalos fijos. La «vida media» de un recuerdo se alarga con cada repaso exitoso. Por eso los intervalos crecen (1, 3, 8, 20 días…), y por eso releer todo el mismo día, que es como dar todas las dosis juntas, rinde tan poco.</div>
      <p class="small faint">Curva ilustrativa con la forma de ley de potencias que usa el algoritmo FSRS. Los valores reales cambian según la persona y la palabra.</p>
    </article>
    <h2 style="margin-bottom:12px">Los principios</h2>
    <div class="stack">${PRINCIPLES.map(p => `<details class="card"><summary style="cursor:pointer;list-style:none"><div class="row-between"><b style="font-family:var(--font-display);font-size:1.08rem">${esc(p.title)}</b>${evBadge(p.ev)}</div><p class="small muted" style="margin-top:6px">${esc(p.what)}</p></summary>
      <div class="stack small" style="margin-top:12px"><p><b>Por qué funciona:</b> ${esc(p.why)}</p><p><b>En la app:</b> ${esc(p.app)}</p>${p.debate ? `<p class="note">${esc(p.debate)}</p>` : ''}<p class="faint">${esc(p.refs)}</p></div></details>`).join('')}</div>
    <h2 style="margin:26px 0 12px">Mitos frecuentes</h2>
    <div class="grid-2">${MYTHS.map(m => `<div class="card stack"><div class="row-between"><b>${esc(m.title)}</b>${evBadge(m.ev)}</div><p class="small">${esc(m.text)}</p><p class="small faint">${esc(m.refs)}</p></div>`).join('')}</div>
    <h2 style="margin:26px 0 12px">Fuera de la app</h2>
    <div class="card stack small">
      <p><b>Series con subtítulos en inglés, no en español.</b> Los subtítulos en el mismo idioma del audio ayudan a la comprensión y al vocabulario (metaanálisis de Montero Perez et al., 2013). Empieza por algo que ya viste en español.</p>
      <p><b>Audio para aprendices, a diario:</b> <a href="https://www.bbc.co.uk/learningenglish/english/features/6-minute-english" target="_blank" rel="noopener">BBC Learning English · 6 Minute English</a> y <a href="https://learningenglish.voanews.com/" target="_blank" rel="noopener">VOA Learning English</a>, que habla más lento.</p>
      <p><b>Tu carrera en inglés:</b> repasa un tema de farmacología que ya entiendes en un video o libro en inglés. Como ya conoces el contenido, el inglés se vuelve comprensible.</p>
      <p><b>Habla con personas:</b> la IA reduce la ansiedad, pero el objetivo final son conversaciones reales (grupos de intercambio, tutorías, compañeros).</p>
    </div>
    <h2 style="margin:26px 0 12px">Comprueba que lo entendiste</h2>
    <div class="card stack-lg">${SCIENCE_QUIZ.map((q, i) => { const a = st.qa[i]; return `<div class="stack"><p><b>${i + 1}.</b> ${esc(q[0])}</p><div class="opts">${q[1].map((o, k) => `<button class="opt ${a !== undefined ? (k === q[2] ? 'ok' : k === a ? 'no' : '') : ''}" data-act="sqAns" data-q="${i}" data-k="${k}" ${a !== undefined ? 'disabled' : ''}><span class="k">${'ABC'[k]}</span>${esc(o)}</button>`).join('')}</div>${a !== undefined ? `<p class="small ${a === q[2] ? '' : 'muted'}">${esc(q[3])}</p>` : ''}</div>`; }).join('')}
      ${answered === SCIENCE_QUIZ.length ? `<p class="feedback ${okN >= 4 ? 'ok' : 'warn'}">${okN} de ${SCIENCE_QUIZ.length}.</p>` : ''}</div>
    <div class="card stack" style="margin-top:22px"><h3>Puntos clave</h3><ul class="prose" style="margin:0;padding-left:18px">
      <li>Recuperar de memoria y espaciar los repasos son las dos técnicas con más evidencia: la app se construye sobre ellas.</li>
      <li>Tu español te regala miles de cognados científicos, pero cuidado con los falsos amigos y con el acento de palabra.</li>
      <li>Entrena primero el oído (muchas voces, pares mínimos); la producción mejora después.</li>
      <li>La fluidez nace de repetir y producir: habla en voz alta todos los días, aunque sea sola/o.</li>
      <li>La meta es ser inteligible y comunicar, no sonar nativo.</li></ul></div>`;
};
ACT.sqAns = el => { const st = UI.ciencia; st.qa[Number(el.dataset.q)] = Number(el.dataset.k); if (Object.keys(st.qa).length === SCIENCE_QUIZ.length) { S.quiz = { d: dkey(), score: SCIENCE_QUIZ.filter((q, i) => st.qa[i] === q[2]).length }; commit(); } render(); };
