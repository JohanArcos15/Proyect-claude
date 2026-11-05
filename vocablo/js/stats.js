/* Vocablo · progreso y estadísticas */
(function () {
  'use strict';
  const V = window.V;

  function entriesSince(fromIdx, deckId) {
    const out = [];
    for (const d of V.state.logs.values()) {
      if (d.idx < fromIdx) continue;
      for (const e of d.entries) {
        if (deckId && e.d !== deckId) continue;
        out.push(Object.assign({ idx: d.idx }, e));
      }
    }
    return out;
  }

  // ---------------------------------------------------------- mapa de calor
  function heatmap(deckId) {
    const weeks = 52;
    const today = V.today();
    const counts = new Map();
    for (const e of entriesSince(today - weeks * 7 - 7, deckId)) counts.set(e.idx, (counts.get(e.idx) || 0) + 1);
    // la columna final termina en el domingo de esta semana (lunes = fila 0)
    const todayDate = new Date(V.dayStart(today));
    const dow = (todayDate.getDay() + 6) % 7;
    const end = today + (6 - dow);
    const start = end - weeks * 7 + 1;
    const max = Math.max(1, ...Array.from(counts.values()));
    const level = (n) => (n <= 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
    const cell = 13;
    const gap = 3;
    const left = 22;
    const top = 16;
    const w = left + weeks * (cell + gap);
    const h = top + 7 * (cell + gap);
    let rects = '';
    let months = '';
    let lastMonth = -1;
    for (let wk = 0; wk < weeks; wk++) {
      for (let d = 0; d < 7; d++) {
        const idx = start + wk * 7 + d;
        if (idx > today) continue;
        const n = counts.get(idx) || 0;
        const date = new Date(V.dayStart(idx));
        if (d === 0 && date.getMonth() !== lastMonth) {
          lastMonth = date.getMonth();
          if (wk < weeks - 1)
            months +=
              '<text x="' +
              (left + wk * (cell + gap)) +
              '" y="10" class="ax">' +
              date.toLocaleDateString('es', { month: 'short' }).replace('.', '') +
              '</text>';
        }
        const label = date.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }) + ': ' + (n ? n + ' ' + V.plural(n, 'ficha', 'fichas') : 'sin repasos');
        rects +=
          '<rect x="' +
          (left + wk * (cell + gap)) +
          '" y="' +
          (top + d * (cell + gap)) +
          '" width="' +
          cell +
          '" height="' +
          cell +
          '" rx="3" class="hm hm-' +
          level(n) +
          (idx === today ? ' hm-today' : '') +
          '" data-tip="' +
          V.esc(label) +
          '"></rect>';
      }
    }
    const dayLabels = ['L', '', 'X', '', 'V', '', 'D']
      .map((l, i) => (l ? '<text x="0" y="' + (top + i * (cell + gap) + cell - 2) + '" class="ax">' + l + '</text>' : ''))
      .join('');
    return (
      '<div class="chart-scroll"><svg class="heatmap" viewBox="0 0 ' +
      w +
      ' ' +
      h +
      '" width="' +
      w +
      '" role="img" aria-label="Fichas repasadas por día en el último año">' +
      months +
      dayLabels +
      rects +
      '</svg></div>' +
      '<div class="hm-legend small muted"><span>Menos</span>' +
      [0, 1, 2, 3, 4].map((l) => '<i class="hm-key hm-' + l + '"></i>').join('') +
      '<span>Más</span></div>'
    );
  }

  // ------------------------------------------------------------ previsión
  function niceMax(v) {
    if (v <= 4) return 4;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
    return 10 * p;
  }

  function forecast(deckIds) {
    const days = 30;
    const today = V.today();
    const counts = new Array(days).fill(0);
    for (const { card } of V.allCards(deckIds)) {
      if (card.suspended || card.type === 'new') continue;
      const idx = SRS.dayIndex(card.due, V.settings().dayStartHour) - today;
      const i = Math.max(0, idx);
      if (i < days) counts[i]++;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    const max = niceMax(Math.max(...counts));
    const W = 640;
    const H = 190;
    const L = 34;
    const B = 24;
    const T = 10;
    const plotW = W - L - 4;
    const plotH = H - B - T;
    const bw = plotW / days;
    const y = (v) => T + plotH - (v / max) * plotH;
    let grid = '';
    for (const t of [0, max / 2, max]) {
      grid +=
        '<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + y(t) + '" y2="' + y(t) + '" class="' + (t === 0 ? 'baseline' : 'gridline') + '"/>' +
        '<text x="' + (L - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end" class="ax">' + V.num(Math.round(t)) + '</text>';
    }
    let bars = '';
    counts.forEach((c, i) => {
      const x = L + i * bw + 1;
      const label =
        (i === 0 ? 'Hoy (incluye vencidas)' : i === 1 ? 'Mañana' : new Date(V.dayStart(today + i)).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })) +
        ': ' +
        c +
        ' ' +
        V.plural(c, 'repaso', 'repasos');
      const hgt = c ? Math.max(2, plotH - (y(c) - T)) : 0;
      bars +=
        '<g data-tip="' + V.esc(label) + '"><rect x="' + (L + i * bw) + '" y="' + T + '" width="' + bw + '" height="' + plotH + '" class="hit"/>' +
        (c ? '<rect x="' + x + '" y="' + (T + plotH - hgt) + '" width="' + Math.max(1, bw - 2) + '" height="' + hgt + '" rx="2" class="bar' + (i === 0 ? ' bar-today' : '') + '"/>' : '') +
        '</g>';
    });
    const xl = [0, 7, 14, 21, 29]
      .map((i) => '<text x="' + (L + i * bw + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="ax">' + (i === 0 ? 'hoy' : '+' + i + ' d') + '</text>')
      .join('');
    return {
      total,
      week: counts.slice(0, 7).reduce((a, b) => a + b, 0),
      svg:
        '<svg class="forecast" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Repasos previstos en los próximos 30 días">' + grid + bars + xl + '</svg>',
    };
  }

  // ---------------------------------------------------------------- vista
  V.routes.progreso = (main) => {
    const deckId = V.state.statsDeck && V.deck(V.state.statsDeck) ? V.state.statsDeck : '';
    const deckIds = deckId ? new Set([deckId]) : null;
    const today = V.today();
    const streak = V.streak();
    const todayEntries = entriesSince(today, deckId).filter((e) => e.idx === today);
    const todayMin = Math.round(todayEntries.reduce((s, e) => s + (e.ms || 0), 0) / 60000);
    const month = entriesSince(today - 29, deckId).filter((e) => !e.cram);
    const reviews = month.filter((e) => e.t === 'review');
    const retention = reviews.length ? Math.round((reviews.filter((e) => e.r > 1).length / reviews.length) * 100) : null;

    // estado de las fichas
    const states = { new: 0, learning: 0, young: 0, mature: 0, suspended: 0 };
    let words = 0;
    for (const n of V.state.notes.values()) if (!deckId || n.deckId === deckId) words++;
    for (const { card } of V.allCards(deckIds)) states[V.cardState(card)]++;
    const active = states.new + states.learning + states.young + states.mature;
    const fc = forecast(deckIds);

    // respuestas
    const answers = [0, 0, 0, 0, 0];
    for (const e of month) answers[e.r]++;
    const answered = answers[1] + answers[2] + answers[3] + answers[4];

    // difíciles
    const hard = Array.from(V.state.notes.values())
      .filter((n) => !deckId || n.deckId === deckId)
      .map((n) => ({ n, l: V.KIND_ORDER.reduce((s, k) => s + ((n.cards[k] && n.cards[k].lapses) || 0), 0) }))
      .filter((x) => x.l >= 2 || (x.n.tags || []).includes('difícil'))
      .sort((a, b) => b.l - a.l)
      .slice(0, 10);

    const seg = (key, label) => {
      const v = states[key];
      if (!active) return '';
      const pct = (v / active) * 100;
      return v ? '<span class="seg-' + key + '" style="flex-grow:' + v + '" data-tip="' + label + ': ' + v + ' (' + Math.round(pct) + ' %)"></span>' : '';
    };
    const legend = (key, label, hint) =>
      '<li><i class="key seg-' + key + '"></i><span class="lg-label">' + label + '<small>' + hint + '</small></span><span class="lg-val">' + V.num(states[key]) + '</span></li>';
    const ansRow = (r, label) => {
      const pct = answered ? (answers[r] / answered) * 100 : 0;
      return (
        '<li><span class="ans-label">' + label + '</span><span class="ans-track"><span class="ans-bar rate-bg-' + r + '" style="width:' + pct.toFixed(1) + '%"></span></span><span class="ans-val">' + Math.round(pct) + ' %<small>' + V.num(answers[r]) + '</small></span></li>'
      );
    };

    main.innerHTML =
      '<section class="page stats">' +
      '<header class="page-head"><div><p class="eyebrow">Progreso</p><h1>Cómo vas</h1></div>' +
      '<label class="select-wrap"><span class="sr-only">Mazo</span><select id="stats-deck"><option value="">Todos los mazos</option>' +
      V.state.meta.decks.map((d) => '<option value="' + V.esc(d.id) + '"' + (d.id === deckId ? ' selected' : '') + '>' + V.esc(d.name) + '</option>').join('') +
      '</select></label></header>' +
      '<div class="tiles">' +
      '<div class="tile"><span class="tile-label">' + V.icon('flame', 16) + 'Racha</span><span class="tile-num">' + streak.n + '<small> ' + V.plural(streak.n, 'día', 'días') + '</small></span><span class="tile-sub">Mejor: ' + streak.best + '</span></div>' +
      '<div class="tile"><span class="tile-label">Hoy</span><span class="tile-num">' + todayEntries.length + '<small> ' + V.plural(todayEntries.length, 'ficha', 'fichas') + '</small></span><span class="tile-sub">' + (todayMin < 1 && todayEntries.length ? '<1' : todayMin) + ' min de estudio</span></div>' +
      '<div class="tile"><span class="tile-label">Retención</span><span class="tile-num">' + (retention == null ? '—' : retention + '<small> %</small>') + '</span><span class="tile-sub">' + (retention == null ? 'Aún sin repasos en 30 días' : 'repasos acertados · 30 días') + '</span></div>' +
      '<div class="tile"><span class="tile-label">Palabras</span><span class="tile-num">' + V.num(words) + '</span><span class="tile-sub">' + V.num(states.mature) + ' ' + V.plural(states.mature, 'ficha madura', 'fichas maduras') + '</span></div>' +
      '</div>' +
      '<section class="panel"><div class="panel-head"><h2>Actividad</h2><span class="muted small">último año</span></div>' + heatmap(deckId) + '</section>' +
      '<section class="panel"><div class="panel-head"><h2>Repasos previstos</h2><span class="muted small">' + V.num(fc.week) + ' esta semana · ' + V.num(fc.total) + ' en 30 días</span></div>' + fc.svg + '</section>' +
      '<div class="two-col">' +
      '<section class="panel"><div class="panel-head"><h2>Estado de tus fichas</h2><span class="muted small">' + V.num(active) + ' activas</span></div>' +
      (active
        ? '<div class="stack-bar" role="img" aria-label="Fichas por estado">' + seg('new', 'Nuevas') + seg('learning', 'Aprendiendo') + seg('young', 'Jóvenes') + seg('mature', 'Maduras') + '</div>'
        : '<p class="muted">Aún no hay fichas.</p>') +
      '<ul class="stack-legend">' +
      legend('new', 'Nuevas', 'aún sin estudiar') +
      legend('learning', 'Aprendiendo', 'en pasos de minutos') +
      legend('young', 'Jóvenes', 'intervalo menor de 21 días') +
      legend('mature', 'Maduras', 'intervalo de 21 días o más') +
      '</ul>' +
      (states.suspended ? '<p class="muted small">' + states.suspended + ' ' + V.plural(states.suspended, 'ficha suspendida', 'fichas suspendidas') + ' no cuentan.</p>' : '') +
      '</section>' +
      '<section class="panel"><div class="panel-head"><h2>Tus respuestas</h2><span class="muted small">30 días · ' + V.num(answered) + '</span></div>' +
      '<ul class="answers">' + ansRow(1, 'Otra vez') + ansRow(2, 'Difícil') + ansRow(3, 'Bien') + ansRow(4, 'Fácil') + '</ul>' +
      '<p class="muted small">Si casi nunca pulsas «Otra vez», puedes subir el número de nuevas al día. Si lo pulsas mucho en repasos, baja el ritmo o añade ejemplos e imágenes.</p>' +
      '</section>' +
      '</div>' +
      '<section class="panel"><div class="panel-head"><h2>Palabras que más se te resisten</h2>' +
      (hard.length ? '<button class="btn btn-ghost btn-sm" data-act="cram-hard">' + V.icon('bolt', 16) + 'Practicarlas</button>' : '') +
      '</div>' +
      (hard.length
        ? '<ol class="hard-list">' +
          hard
            .map(
              (x) =>
                '<li><button class="link-row" data-open="' + V.esc(x.n.id) + '"><span class="w-word">' + V.esc(x.n.word) + '</span><span class="w-tr">' + V.esc(x.n.translation) + '</span><span class="w-due">' + x.l + ' ' + V.plural(x.l, 'fallo', 'fallos') + '</span></button></li>'
            )
            .join('') +
          '</ol>'
        : '<p class="muted">Ninguna por ahora. Las palabras que falles dos veces o más aparecerán aquí.</p>') +
      '</section>' +
      '<p class="muted small method-note">La retención cuenta solo fichas en repaso (no las que estás aprendiendo), como la «true retention» de Anki. Con SM-2 o FSRS al 90 %, lo esperable es rondar el 85-92 %.</p>' +
      '</section>';

    const section = main.firstElementChild;
    V.$('#stats-deck').addEventListener('change', (e) => {
      V.state.statsDeck = e.target.value;
      V.state.keepScroll = true;
      V.render();
    });
    section.addEventListener('click', (e) => {
      const o = e.target.closest('[data-open]');
      if (o) {
        const note = V.state.notes.get(o.dataset.open);
        if (note) V.showNoteInfo(note, () => V.render());
      }
      if (e.target.closest('[data-act="cram-hard"]')) {
        const items = [];
        for (const x of hard) for (const k of V.KIND_ORDER) if (x.n.cards[k] && !x.n.cards[k].suspended) items.push({ note: x.n, kind: k });
        V.startCram(items, 'Palabras difíciles');
      }
    });
    V.$$('.chart-scroll', section).forEach((el) => (el.scrollLeft = el.scrollWidth));
    V.bindTips(section);
  };

  // --------------------------------------------------------- tooltip común
  V.bindTips = (root) => {
    let tip = V.$('#chart-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'chart-tip';
      tip.className = 'chart-tip';
      tip.hidden = true;
      document.body.appendChild(tip);
    }
    const show = (el, x, y) => {
      tip.textContent = el.getAttribute('data-tip');
      tip.hidden = false;
      const r = tip.getBoundingClientRect();
      const left = V.clamp(x - r.width / 2, 8, window.innerWidth - r.width - 8);
      const top = y - r.height - 12 < 8 ? y + 16 : y - r.height - 12;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    };
    root.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el) show(el, e.clientX, e.clientY);
      else tip.hidden = true;
    });
    root.addEventListener('pointerleave', () => (tip.hidden = true));
    const prev = V.cleanup;
    V.cleanup = () => {
      tip.hidden = true;
      prev && prev();
    };
  };
})();
