/* Vocablo · sesión de estudio */
(function () {
  'use strict';
  const V = window.V;
  const keyOf = (it) => it.note.id + ':' + it.kind;

  // ------------------------------------------------------ caras de la ficha
  V.highlightExample = (note) => {
    const m = V.clozeMatch(note);
    const ex = note.example || '';
    if (!m) return V.esc(ex);
    return V.esc(ex.slice(0, m.start)) + '<mark>' + V.esc(m.text) + '</mark>' + V.esc(ex.slice(m.end));
  };

  const phonLine = (note, withSpeak) =>
    '<div class="phon">' +
    (withSpeak && V.speech.supported
      ? '<button class="speak-btn" data-act="speak" aria-label="Escuchar pronunciación" title="Escuchar (R)">' +
        V.icon('speaker', 18) +
        '</button>'
      : '') +
    (note.ipa ? '<span class="ipa">' + V.esc(note.ipa) + '</span>' : '') +
    (note.pos ? '<span class="pos" title="' + V.esc(V.POS_ES[note.pos] || note.pos) + '">' + V.esc(V.POS[note.pos] || note.pos) + '</span>' : '') +
    (note.level ? '<span class="level">' + V.esc(note.level) + '</span>' : '') +
    '</div>';

  V.frontHtml = (note, kind, opts) => {
    opts = opts || {};
    const typing = opts.typing;
    const input = typing
      ? '<label class="type-wrap"><span class="sr-only">Tu respuesta</span><input id="type-answer" class="type-answer" type="text" placeholder="' +
        (kind === 'production' || kind === 'listening' ? 'Escribe la palabra en inglés' : 'Escribe la palabra que falta') +
        '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"></label>'
      : '';
    const hint = opts.hint ? '<p class="hint-line" aria-live="polite">' + V.esc(opts.hint) + '</p>' : '';
    if (kind === 'production') {
      return (
        '<p class="prompt-label">¿Cómo se dice en inglés?</p>' +
        '<h2 class="headword headword-es">' +
        V.esc(note.translation || '—') +
        '</h2>' +
        (note.pos ? '<p class="pos-es">' + V.esc(V.POS_ES[note.pos] || note.pos) + '</p>' : '') +
        (note.image ? '<img class="card-img" src="' + V.esc(note.image) + '" alt="">' : '') +
        hint +
        input
      );
    }
    if (kind === 'listening') {
      return (
        '<p class="prompt-label">¿Qué palabra oyes?</p>' +
        '<div class="listen-row">' +
        '<button class="big-play" data-act="speak" aria-label="Reproducir">' +
        V.icon('speaker', 34) +
        '</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="speak-slow">Más despacio</button>' +
        '</div>' +
        (V.speech.supported ? '' : '<p class="muted small">Este navegador no tiene voz sintética: la ficha no puede sonar.</p>') +
        hint +
        input
      );
    }
    if (kind === 'cloze') {
      const m = V.clozeMatch(note);
      const ex = note.example || '';
      const sentence = m
        ? V.esc(ex.slice(0, m.start)) +
          '<span class="blank" aria-label="hueco">' +
          (opts.hint ? V.esc(opts.hint) : '&nbsp;'.repeat(Math.max(6, m.text.length))) +
          '</span>' +
          V.esc(ex.slice(m.end))
        : V.esc(ex);
      return (
        '<p class="prompt-label">Completa la frase</p>' +
        '<p class="cloze-sentence">' +
        sentence +
        '</p>' +
        (note.exampleTr ? '<p class="cloze-tr">' + V.esc(note.exampleTr) + '</p>' : '') +
        input
      );
    }
    // recognition
    return (
      '<h2 class="headword">' +
      V.esc(note.word) +
      '</h2>' +
      phonLine(note, true) +
      hint
    );
  };

  V.backHtml = (note, kind, opts) => {
    opts = opts || {};
    const parts = [];
    if (opts.compare) parts.push(opts.compare);
    if (kind === 'recognition') {
      parts.push('<p class="answer-main">' + V.esc(note.translation || '—') + '</p>');
    } else {
      parts.push('<h3 class="headword headword-back">' + V.esc(note.word) + '</h3>' + phonLine(note, true));
      if (kind !== 'production') parts.push('<p class="answer-tr">' + V.esc(note.translation || '') + '</p>');
    }
    const entry = [];
    if (note.definition) entry.push('<p class="definition">' + V.esc(note.definition) + '</p>');
    if (note.example && kind !== 'cloze') {
      entry.push(
        '<blockquote class="example"><p>' +
          V.highlightExample(note) +
          (V.speech.supported
            ? ' <button class="speak-inline" data-act="speak-example" aria-label="Escuchar el ejemplo">' + V.icon('speaker', 15) + '</button>'
            : '') +
          '</p>' +
          (note.exampleTr ? '<p class="example-tr">' + V.esc(note.exampleTr) + '</p>' : '') +
          '</blockquote>'
      );
    }
    if (note.example && kind === 'cloze') {
      entry.push('<blockquote class="example"><p>' + V.highlightExample(note) + '</p></blockquote>');
    }
    if (note.synonyms) entry.push('<p class="meta-line"><span class="meta-key">Sinónimos</span> ' + V.esc(note.synonyms) + '</p>');
    if (note.mnemonic)
      entry.push('<p class="mnemonic">' + V.icon('bulb', 16) + '<span>' + V.esc(note.mnemonic) + '</span></p>');
    if (note.notes) entry.push('<p class="meta-line note-text">' + V.esc(note.notes) + '</p>');
    if (entry.length) parts.push('<div class="entry">' + entry.join('') + '</div>');
    if (note.image && kind !== 'production') parts.push('<img class="card-img" src="' + V.esc(note.image) + '" alt="">');
    if (opts.practice && V.listen.supported) {
      parts.push(
        '<div class="say-row"><button class="btn btn-ghost btn-sm" data-act="say">' +
          V.icon('mic', 16) +
          'Practicar pronunciación</button><span class="say-result" aria-live="polite"></span></div>'
      );
    }
    return parts.join('');
  };

  // ----------------------------------------------------- comparar escritura
  function align(a, b) {
    const n = a.length;
    const m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let j = 0; j <= m; j++) dp[0][j] = j;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    const ops = [];
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1)) {
        ops.push(a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? ['ok', a[i - 1], b[j - 1]] : ['sub', a[i - 1], b[j - 1]]);
        i--;
        j--;
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        ops.push(['extra', a[i - 1], '']);
        i--;
      } else {
        ops.push(['miss', '', b[j - 1]]);
        j--;
      }
    }
    return { ops: ops.reverse(), dist: dp[n][m] };
  }
  V.align = align;

  V.compareTyped = (typed, expectedList) => {
    const t = typed.trim();
    const cands = expectedList.filter(Boolean);
    let best = null;
    for (const e of cands) {
      const r = align(t, e.trim());
      if (!best || r.dist < best.dist) best = Object.assign(r, { expected: e.trim() });
    }
    if (!best) return { html: '', rating: 3 };
    const exact = V.norm(t) === V.norm(best.expected);
    const ratio = best.dist / Math.max(1, best.expected.length);
    const rating = exact ? 3 : best.dist <= 1 || ratio <= 0.2 ? 2 : 1;
    let html;
    if (!t) {
      html = '<div class="compare"><p class="compare-line"><span class="muted">No escribiste nada.</span></p></div>';
    } else if (exact) {
      html =
        '<div class="compare compare-ok"><p class="compare-line">' +
        V.icon('check', 16) +
        '<span class="c-ok">' +
        V.esc(t) +
        '</span></p></div>';
    } else {
      const typedLine = best.ops
        .map(([op, a]) => (op === 'ok' ? '<span class="c-ok">' + V.esc(a) + '</span>' : op === 'miss' ? '<span class="c-gap">·</span>' : '<span class="c-bad">' + V.esc(a) + '</span>'))
        .join('');
      const expLine = best.ops
        .filter(([op]) => op !== 'extra')
        .map(([op, , b]) => (op === 'ok' ? V.esc(b) : '<span class="c-fix">' + V.esc(b) + '</span>'))
        .join('');
      html =
        '<div class="compare"><p class="compare-line"><span class="compare-key">Escribiste</span><span class="mono">' +
        typedLine +
        '</span></p><p class="compare-line"><span class="compare-key">Correcto</span><span class="mono">' +
        expLine +
        '</span></p></div>';
    }
    return { html, rating };
  };

  // --------------------------------------------------------------- sesión
  V.startStudy = (deckIds, opts) => {
    opts = opts || {};
    const title = opts.title || (deckIds && deckIds.size === 1 ? (V.deck([...deckIds][0]) || {}).name : 'Todos los mazos');
    V.state.session = {
      deckIds: deckIds || null,
      title,
      cram: !!opts.cram,
      cramList: opts.cramList || [],
      startedAt: Date.now(),
      answered: 0,
      correct: 0,
      again: 0,
      sinceNew: 0,
      undo: [],
      failed: new Map(),
      current: null,
      revealed: false,
      shownAt: 0,
      hint: 0,
      lastKey: null,
      forceAhead: false,
      initialTotal: null,
    };
    V.go('estudiar');
  };

  V.startCram = (items, title) => {
    const list = items.slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    V.startStudy(null, { cram: true, cramList: list.map((x) => ({ noteId: x.note.id, kind: x.kind })), title });
  };

  function pickNext(s) {
    if (s.cram) {
      while (s.cramList.length) {
        const ref = s.cramList[0];
        const note = V.state.notes.get(ref.noteId);
        if (note && note.cards[ref.kind]) return { item: { note, kind: ref.kind, card: note.cards[ref.kind] } };
        s.cramList.shift();
      }
      return null;
    }
    const now = Date.now();
    const st = V.settings();
    const q = V.queue(s.deckIds, now);
    s.counts = { n: q.news.length, l: q.learn.length, r: q.reviews.length };
    if (s.initialTotal == null) s.initialTotal = q.news.length + q.learn.length + q.reviews.length;
    const due = q.learn.filter((x) => x.card.due <= now);
    const others = q.reviews.length + q.news.length;
    if (due.length) {
      let pick = due[0];
      if (keyOf(pick) === s.lastKey && (due.length > 1 || others)) pick = due[1] || null;
      if (pick) return { item: pick };
    }
    if (others) {
      let useNew;
      if (!q.news.length) useNew = false;
      else if (!q.reviews.length) useNew = true;
      else if (st.newMix === 'before') useNew = true;
      else if (st.newMix === 'after') useNew = false;
      else useNew = s.sinceNew >= Math.max(1, Math.floor(q.reviews.length / q.news.length));
      return { item: useNew ? q.news[0] : q.reviews[0], isNew: useNew };
    }
    const ahead = q.learn.filter((x) => x.card.due <= now + st.learnAheadMin * 60000 || s.forceAhead);
    if (ahead.length) {
      s.forceAhead = false;
      let pick = ahead[0];
      if (keyOf(pick) === s.lastKey && ahead.length > 1 && ahead[1].card.due <= now + 60000) pick = ahead[1];
      return { item: pick };
    }
    if (q.learn.length) return { wait: q.learn[0].card.due, waiting: q.learn.length };
    return null;
  }

  function usesTyping(kind) {
    if (kind === 'listening' || kind === 'cloze') return true;
    if (kind === 'production') return V.settings().typeAnswer;
    return false;
  }

  function expectedFor(note, kind) {
    if (kind === 'recognition') return [note.translation];
    const list = [note.word, note.word.replace(/^to\s+/i, '')];
    if (kind === 'cloze') {
      const m = V.clozeMatch(note);
      if (m) list.unshift(m.text);
    }
    return list;
  }

  function hintText(note, kind, level) {
    if (!level) return '';
    const target =
      kind === 'recognition'
        ? (note.translation || '').split(',')[0].trim()
        : kind === 'cloze'
          ? (V.clozeMatch(note) || { text: note.word }).text
          : note.word;
    const shown = Math.min(target.length, level === 1 ? 1 : level === 2 ? Math.ceil(target.length / 3) : Math.ceil(target.length / 2));
    return target
      .split('')
      .map((ch, i) => (i < shown || ch === ' ' || ch === '-' ? ch : '_'))
      .join(' ');
  }

  function speakWord(note, slow) {
    V.speech.speak(note.word, slow ? 0.55 : undefined);
  }

  // --------------------------------------------------------------- render
  V.routes.estudiar = (main) => {
    const s = V.state.session;
    const fresh = s.current && V.state.notes.get(s.current.note.id);
    if (s.mode !== 'card' || !fresh || !fresh.cards[s.current.kind]) {
      if (s.mode === 'card' || !s.mode) advance(true);
      else draw(true);
    } else {
      s.current = { note: fresh, kind: s.current.kind, card: fresh.cards[s.current.kind] };
      draw();
    }

    const onKey = (e) => handleKey(e);
    document.addEventListener('keydown', onKey);
    const onClick = (e) => handleClick(e);
    main.addEventListener('click', onClick);
    V.cleanup = () => {
      document.removeEventListener('keydown', onKey);
      main.removeEventListener('click', onClick);
      clearInterval(s.waitTimer);
      V.speech.stop();
    };
  };

  function advance(initial) {
    const s = V.state.session;
    clearInterval(s.waitTimer);
    const next = pickNext(s);
    s.revealed = false;
    s.hint = 0;
    s.typed = '';
    s.compare = null;
    s.suggest = null;
    if (!next) {
      s.current = null;
      s.mode = 'done';
    } else if (next.wait) {
      s.current = null;
      s.mode = 'wait';
      s.waitUntil = next.wait;
      s.waiting = next.waiting;
    } else {
      s.mode = 'card';
      s.current = next.item;
      s.currentIsNew = next.item.card.type === 'new';
      s.shownAt = Date.now();
    }
    draw(initial);
    if (s.mode === 'card') {
      const st = V.settings();
      const kind = s.current.kind;
      if (kind === 'listening' || (st.autoPlay && kind === 'recognition')) {
        const shown = s.current;
        setTimeout(() => {
          if (V.state.session === s && s.current === shown && V.state.view === 'estudiar') speakWord(shown.note);
        }, 120);
      }
    }
  }

  function countsHtml(s) {
    if (s.cram) return '<span class="count-pill">' + V.num(s.cramList.length) + ' en práctica</span>';
    const c = s.counts || { n: 0, l: 0, r: 0 };
    const cur = s.current && s.mode === 'card' ? V.cardState(s.current.card) : null;
    const u = (k) => (cur === k ? ' is-current' : '');
    return (
      '<span class="counts" aria-label="Nuevas, en aprendizaje y para repasar">' +
      '<span class="c-new' + u('new') + '" title="Nuevas">' + c.n + '</span>' +
      '<span class="c-learn' + u('learning') + '" title="En aprendizaje">' + c.l + '</span>' +
      '<span class="c-due' + (cur === 'young' || cur === 'mature' ? ' is-current' : '') + '" title="Para repasar">' + c.r + '</span>' +
      '</span>'
    );
  }

  function draw(initial) {
    const s = V.state.session;
    const main = V.$('#view');
    const total = s.cram ? s.answered + s.cramList.length : s.answered + ((s.counts && s.counts.n + s.counts.l + s.counts.r) || 0);
    const pct = total ? Math.round((s.answered / total) * 100) : 100;
    const bar =
      '<header class="study-bar">' +
      '<button class="icon-btn" data-act="exit" aria-label="Terminar sesión" title="Terminar (Esc)">' +
      V.icon('x') +
      '</button>' +
      '<div class="study-title"><span>' +
      V.esc(s.title || '') +
      '</span>' +
      (s.cram ? '<span class="badge badge-soft">Práctica libre · no cambia tus intervalos</span>' : '') +
      '</div>' +
      countsHtml(s) +
      '<button class="icon-btn" data-act="undo" aria-label="Deshacer" title="Deshacer (U)"' +
      (s.undo.length ? '' : ' disabled') +
      '>' +
      V.icon('undo') +
      '</button>' +
      '</header>' +
      '<div class="study-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      pct +
      '"><span style="width:' +
      pct +
      '%"></span></div>';

    if (s.mode === 'done') {
      main.innerHTML = '<section class="study">' + bar + doneHtml(s) + '</section>';
      return;
    }
    if (s.mode === 'wait') {
      main.innerHTML = '<section class="study">' + bar + waitHtml(s) + '</section>';
      s.waitTimer = setInterval(() => {
        const left = s.waitUntil - Date.now();
        const el = V.$('#countdown');
        if (left <= 0) {
          advance();
          return;
        }
        if (el) el.textContent = mmss(left);
      }, 1000);
      return;
    }

    const { note, kind, card } = s.current;
    const typing = usesTyping(kind);
    const state = V.cardState(card);
    const stateLabel = { new: 'Nueva', learning: card.type === 'relearning' ? 'Reaprendiendo' : 'Aprendiendo', young: 'Repaso', mature: 'Madura' }[state];
    const deck = V.deck(note.deckId);
    const html =
      '<section class="study">' +
      bar +
      '<div class="study-stage">' +
      '<article class="flash kind-' +
      kind +
      (s.revealed ? ' is-revealed' : '') +
      (initial || V.reduceMotion() ? '' : ' enter') +
      '" aria-live="polite">' +
      '<div class="flash-top">' +
      '<span class="kind-chip">' +
      V.esc(V.KINDS[kind].short) +
      '</span>' +
      (s.cram ? '' : '<span class="state-chip state-' + state + '">' + stateLabel + '</span>') +
      (deck && (!s.deckIds || s.deckIds.size > 1) ? '<span class="deck-chip"><i style="background:' + V.deckColor(deck) + '"></i>' + V.esc(deck.name) + '</span>' : '') +
      '<span class="flash-tools">' +
      '<button class="icon-btn icon-btn-sm" data-act="hint" title="Pista (H)" aria-label="Pista"' +
      (s.revealed ? ' disabled' : '') +
      '>' +
      V.icon('bulb', 18) +
      '</button>' +
      '<button class="icon-btn icon-btn-sm" data-act="edit" title="Editar (E)" aria-label="Editar palabra">' +
      V.icon('edit', 18) +
      '</button>' +
      '<button class="icon-btn icon-btn-sm" data-act="more" title="Más opciones" aria-label="Más opciones">' +
      V.icon('more', 18) +
      '</button>' +
      '</span>' +
      '</div>' +
      '<div class="flash-front">' +
      V.frontHtml(note, kind, { typing: typing && !s.revealed, hint: hintText(note, kind, s.hint) }) +
      (typing && s.revealed && !s.compare ? '' : '') +
      '</div>' +
      (s.revealed
        ? '<div class="flash-back">' + V.backHtml(note, kind, { compare: s.compare, practice: true }) + '</div>'
        : '') +
      '</article>' +
      '</div>' +
      '<div class="answer-bar">' +
      (s.revealed ? ratingsHtml(s, card) : '<button class="btn btn-primary btn-reveal" data-act="reveal">Mostrar respuesta <kbd>Espacio</kbd></button>') +
      '</div>' +
      '</section>';
    main.innerHTML = html;
    const input = V.$('#type-answer');
    if (input && !s.revealed) {
      input.value = s.typed || '';
      input.addEventListener('input', () => (s.typed = input.value));
      if (window.matchMedia('(pointer: fine)').matches) input.focus();
    }
  }

  function ratingsHtml(s, card) {
    const labels = ['', 'Otra vez', 'Difícil', 'Bien', 'Fácil'];
    let ivl = {};
    if (!s.cram) {
      const p = SRS.preview(card, Date.now(), V.schedCfg());
      for (const r of [1, 2, 3, 4]) ivl[r] = SRS.formatInterval(p[r]);
    } else {
      ivl = { 1: 'otra vez pronto', 2: 'al final', 3: 'hecha', 4: 'hecha' };
    }
    return (
      '<div class="ratings" role="group" aria-label="¿Qué tal la recordaste?">' +
      [1, 2, 3, 4]
        .map(
          (r) =>
            '<button class="rate rate-' +
            r +
            (s.suggest === r ? ' suggested' : '') +
            '" data-rate="' +
            r +
            '"><span class="rate-ivl">' +
            V.esc(ivl[r]) +
            '</span><span class="rate-label">' +
            labels[r] +
            '</span><kbd>' +
            r +
            '</kbd></button>'
        )
        .join('') +
      '</div>'
    );
  }

  function mmss(ms) {
    const t = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(t / 60);
    return m + ':' + String(t % 60).padStart(2, '0');
  }

  function waitHtml(s) {
    return (
      '<div class="study-state">' +
      '<div class="state-icon">' +
      V.icon('clock', 30) +
      '</div>' +
      '<h2>Todo al día por ahora</h2>' +
      '<p>' +
      (s.waiting === 1 ? 'Te queda 1 ficha en aprendizaje.' : 'Te quedan ' + s.waiting + ' fichas en aprendizaje.') +
      ' La siguiente vuelve en <strong id="countdown" class="tabular">' +
      mmss(s.waitUntil - Date.now()) +
      '</strong>. Esperar ese rato es parte del método: la repasas justo cuando empieza a olvidarse.</p>' +
      '<div class="row-actions"><button class="btn btn-primary" data-act="ahead">Repasarla ya</button><button class="btn btn-ghost" data-act="exit">Terminar por hoy</button></div>' +
      '</div>'
    );
  }

  function doneHtml(s) {
    const mins = Math.max(0, Math.round((Date.now() - s.startedAt) / 60000));
    const acc = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
    const moreNew = !s.cram && hasMoreNew(s);
    return (
      '<div class="study-state">' +
      '<div class="state-icon state-icon-ok">' +
      V.icon('check', 30) +
      '</div>' +
      '<h2>' +
      (s.answered ? 'Sesión completada' : 'No hay fichas pendientes') +
      '</h2>' +
      (s.answered
        ? '<dl class="done-stats"><div><dt>Fichas</dt><dd>' +
          V.num(s.answered) +
          '</dd></div><div><dt>Recordadas</dt><dd>' +
          acc +
          ' %</dd></div><div><dt>Tiempo</dt><dd>' +
          (mins < 1 ? '<1' : mins) +
          ' min</dd></div></dl>'
        : '<p>' + (s.cram ? 'No había fichas para practicar.' : 'Has terminado lo que tocaba hoy en este mazo. Vuelve mañana: las fichas aparecerán justo cuando estés a punto de olvidarlas.') + '</p>') +
      '<div class="row-actions">' +
      (s.failed.size
        ? '<button class="btn btn-ghost" data-act="cram-failed">' + V.icon('bolt', 16) + 'Practicar las ' + s.failed.size + ' falladas</button>'
        : '') +
      (moreNew ? '<button class="btn btn-ghost" data-act="more-new">' + V.icon('plus', 16) + 'Aprender 10 nuevas más hoy</button>' : '') +
      '<button class="btn btn-primary" data-act="exit">Volver al inicio</button>' +
      '</div>' +
      '</div>'
    );
  }

  function hasMoreNew(s) {
    for (const it of V.allCards(s.deckIds)) {
      if (it.card.type === 'new' && !it.card.suspended) return true;
    }
    return false;
  }

  // ------------------------------------------------------------- acciones
  function reveal() {
    const s = V.state.session;
    if (!s.current || s.revealed) return;
    const { note, kind } = s.current;
    if (usesTyping(kind)) {
      const input = V.$('#type-answer');
      const typed = input ? input.value : s.typed || '';
      const cmp = V.compareTyped(typed, expectedFor(note, kind));
      s.compare = cmp.html;
      s.suggest = typed.trim() ? cmp.rating : null;
    }
    s.revealed = true;
    draw(true);
    const st = V.settings();
    if (st.autoPlay && (kind === 'production' || kind === 'cloze')) speakWord(note);
    const first = V.$('.rate.suggested') || V.$('.rate-3');
    if (first && window.matchMedia('(pointer: fine)').matches) first.focus({ preventScroll: true });
  }

  function answer(rating) {
    const s = V.state.session;
    if (!s.current || !s.revealed) return;
    const { note, kind } = s.current;
    const key = keyOf(s.current);
    const now = Date.now();
    let leechMsg = null;

    try {
      if (s.cram) {
        const ref = s.cramList[0];
        const day = V.logDay(SRS.dayIndex(now, V.settings().dayStartHour));
        day.entries.push({ id: now, n: note.id, k: kind, d: note.deckId, r: rating, t: 'cram', cram: true, ms: Math.min(60000, now - s.shownAt) });
        V.saveLogDay(day);
        s.cramList.shift();
        if (rating === 1) s.cramList.splice(Math.min(3, s.cramList.length), 0, ref);
        else if (rating === 2) s.cramList.push(ref);
        s.undo.push({ cram: true, ref, rating });
      } else {
        // Se trabaja sobre una copia: la palabra solo cambia si todo sale bien.
        const card = note.cards[kind];
        const before = V.clone(note);
        const updated = V.clone(note);
        const res = SRS.answer(card, rating, now, V.schedCfg());
        const next = res.card;
        if (res.leech) {
          if (!updated.tags.includes('difícil')) updated.tags.push('difícil');
          if (V.settings().leechAction === 'suspend') {
            next.suspended = true;
            leechMsg = '«' + note.word + '» se te resiste: la suspendí para que la revises en Explorar.';
          } else {
            leechMsg = '«' + note.word + '» se te resiste: la marqué como «difícil». Prueba a añadirle una imagen o una mnemotecnia.';
          }
        }
        updated.cards[kind] = next;
        const day = V.logDay(SRS.dayIndex(now, V.settings().dayStartHour));
        const entry = {
          id: now,
          n: note.id,
          k: kind,
          d: note.deckId,
          r: rating,
          t: card.type,
          i: res.log.ivl,
          l: res.log.lastIvl,
          e: V.settings().algorithm === 'fsrs' ? Math.round((next.difficulty || 0) * 100) / 100 : next.ease,
          ms: Math.min(60000, now - s.shownAt),
        };
        day.entries.push(entry);
        V.saveNote(updated);
        V.saveLogDay(day);
        s.undo.push({ before, dayKey: day.day, entryId: entry.id, kind, sinceNew: s.sinceNew, rating });
        if (s.undo.length > 50) s.undo.shift();
        if (s.currentIsNew) s.sinceNew = 0;
        else if (card.type === 'review') s.sinceNew++;
      }
    } catch (err) {
      V.toast('No se pudo guardar la respuesta: ' + ((err && err.message) || err) + '. Recarga la página.', { tone: 'bad', timeout: 8000 });
      return;
    }

    s.lastKey = key;
    if (rating === 1) s.failed.set(key, { note, kind });
    if (rating > 1) s.correct++;
    else s.again++;
    s.answered++;
    if (leechMsg) V.toast(leechMsg, { timeout: 6000 });
    advance();
  }

  function undo() {
    const s = V.state.session;
    const u = s.undo.pop();
    if (!u) return;
    s.answered = Math.max(0, s.answered - 1);
    if (u.rating > 1) s.correct = Math.max(0, s.correct - 1);
    else s.again = Math.max(0, s.again - 1);
    if (u.cram) {
      const i = s.cramList.lastIndexOf(u.ref);
      if (i >= 0) s.cramList.splice(i, 1);
      s.cramList.unshift(u.ref);
      const note = V.state.notes.get(u.ref.noteId);
      // quitar el registro de práctica
      for (const day of V.state.logs.values()) {
        const idx = day.entries.findIndex((e) => e.cram && e.n === u.ref.noteId && e.k === u.ref.kind);
        if (idx >= 0 && day.entries.length - 1 === idx) {
          day.entries.splice(idx, 1);
          V.saveLogDay(day);
          break;
        }
      }
      s.current = note ? { note, kind: u.ref.kind, card: note.cards[u.ref.kind] } : null;
    } else {
      const restored = u.before;
      V.saveNote(restored);
      const day = V.state.logs.get(u.dayKey);
      if (day) {
        day.entries = day.entries.filter((e) => e.id !== u.entryId);
        V.saveLogDay(day);
      }
      s.sinceNew = u.sinceNew;
      s.current = { note: restored, kind: u.kind, card: restored.cards[u.kind] };
      s.currentIsNew = s.current.card.type === 'new';
      const q = V.queue(s.deckIds);
      s.counts = { n: q.news.length, l: q.learn.length, r: q.reviews.length };
    }
    clearInterval(s.waitTimer);
    s.mode = s.current ? 'card' : 'done';
    s.revealed = false;
    s.hint = 0;
    s.compare = null;
    s.suggest = null;
    s.shownAt = Date.now();
    draw(true);
    V.toast('Respuesta deshecha');
  }

  async function moreMenu() {
    const s = V.state.session;
    if (!s.current) return;
    const { note, kind } = s.current;
    const choice = await V.modal({
      title: note.word,
      body: '<p class="muted">Ficha «' + V.esc(V.KINDS[kind].label) + '»</p>',
      actions: [
        { label: 'Información', kind: 'ghost', value: 'info' },
        { label: 'Enterrar hasta mañana', kind: 'ghost', value: 'bury' },
        { label: 'Suspender', kind: 'ghost', value: 'suspend' },
      ],
    });
    if (choice === 'info') {
      V.showNoteInfo(note);
    } else if (choice === 'bury' || choice === 'suspend') {
      if (s.cram) {
        s.cramList.shift();
      } else {
        const card = note.cards[kind];
        if (choice === 'bury') card.buriedUntil = V.dayStart(V.today() + 1);
        else card.suspended = true;
        V.saveNote(note);
      }
      V.toast(choice === 'bury' ? 'Enterrada hasta mañana' : 'Ficha suspendida', {
        action: s.cram
          ? null
          : {
              label: 'Deshacer',
              fn: () => {
                const c = note.cards[kind];
                delete c.buriedUntil;
                c.suspended = false;
                V.saveNote(note);
                if (V.state.view === 'estudiar') advance();
              },
            },
      });
      advance();
    }
  }

  async function sayIt() {
    const s = V.state.session;
    const out = V.$('.say-result');
    if (!s.current || !out) return;
    const note = s.current.note;
    out.textContent = 'Escuchando… di la palabra en voz alta.';
    out.className = 'say-result';
    try {
      const alts = await V.listen.once(V.settings().accent);
      const target = V.norm(note.word.replace(/^to\s+/i, ''));
      const hit = alts.find((a) => V.norm(a).includes(target));
      if (hit) {
        out.textContent = '¡Bien dicho! Se entendió «' + hit + '».';
        out.className = 'say-result say-ok';
      } else if (alts.length) {
        out.textContent = 'Se entendió «' + alts[0] + '». Escúchala y vuelve a probar.';
        out.className = 'say-result say-bad';
      } else {
        out.textContent = 'No se oyó nada. Prueba otra vez más cerca del micrófono.';
      }
    } catch (err) {
      out.textContent =
        err === 'not-allowed' || err === 'service-not-allowed'
          ? 'El micrófono no está permitido en esta página.'
          : 'No se pudo usar el reconocimiento de voz aquí.';
      out.className = 'say-result say-bad';
    }
  }

  function exit() {
    const s = V.state.session;
    clearInterval(s && s.waitTimer);
    V.state.session = null;
    V.go('hoy');
  }

  function handleClick(e) {
    const s = V.state.session;
    const rate = e.target.closest('[data-rate]');
    if (rate) {
      answer(+rate.dataset.rate);
      return;
    }
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const note = s.current && s.current.note;
    switch (act) {
      case 'exit':
        exit();
        break;
      case 'reveal':
        reveal();
        break;
      case 'undo':
        undo();
        break;
      case 'speak':
        note && speakWord(note);
        break;
      case 'speak-slow':
        note && speakWord(note, true);
        break;
      case 'speak-example':
        note && V.speech.speak(note.example);
        break;
      case 'hint':
        s.hint = Math.min(3, s.hint + 1);
        {
          const input = V.$('#type-answer');
          if (input) s.typed = input.value;
        }
        draw(true);
        break;
      case 'edit':
        if (note) V.go('anadir', { noteId: note.id, returnTo: 'estudiar' });
        break;
      case 'more':
        moreMenu();
        break;
      case 'say':
        sayIt();
        break;
      case 'ahead':
        s.forceAhead = true;
        advance();
        break;
      case 'more-new': {
        const meta = V.state.meta;
        const today = V.today();
        meta.extraNew = { day: today, n: (meta.extraNew && meta.extraNew.day === today ? meta.extraNew.n : 0) + 10 };
        V.saveMeta();
        advance();
        break;
      }
      case 'cram-failed': {
        const items = Array.from(s.failed.values());
        V.startCram(items, 'Falladas de hoy');
        break;
      }
    }
  }

  function handleKey(e) {
    const s = V.state.session;
    if (!s || document.querySelector('.modal-backdrop')) return;
    const inInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (inInput) {
      if (e.key === 'Enter') {
        e.preventDefault();
        reveal();
      }
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.metaKey || e.altKey) return;
    if (e.ctrlKey) {
      if (e.key === 'z') {
        e.preventDefault();
        undo();
      }
      return;
    }
    const k = e.key;
    if (k === ' ' || k === 'Enter') {
      if (e.target && e.target.tagName === 'BUTTON' && k === 'Enter') return;
      e.preventDefault();
      if (s.mode === 'card') {
        if (!s.revealed) reveal();
        else answer(s.suggest || 3);
      }
      return;
    }
    if (s.mode === 'card' && s.revealed && ['1', '2', '3', '4'].includes(k)) {
      e.preventDefault();
      answer(+k);
      return;
    }
    const lower = k.toLowerCase();
    if (lower === 'r' && s.current) speakWord(s.current.note);
    else if (lower === 'h' && s.current && !s.revealed) handleClick({ target: V.$('[data-act="hint"]') || document.body });
    else if (lower === 'e' && s.current) V.go('anadir', { noteId: s.current.note.id, returnTo: 'estudiar' });
    else if (lower === 'u') undo();
    else if (k === 'Escape') exit();
  }
})();
