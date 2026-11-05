/* Vocablo · inicio: hoy, racha y mazos */
(function () {
  'use strict';
  const V = window.V;

  V.streak = () => {
    const days = new Set();
    for (const d of V.state.logs.values()) if (d.entries.length) days.add(d.idx);
    const today = V.today();
    let t = days.has(today) ? today : today - 1;
    let n = 0;
    while (days.has(t)) {
      n++;
      t--;
    }
    let best = 0;
    const sorted = Array.from(days).sort((a, b) => a - b);
    let run = 0;
    for (let i = 0; i < sorted.length; i++) {
      run = i && sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
      best = Math.max(best, run);
    }
    return { n, studiedToday: days.has(today), best };
  };

  V.avgAnswerMs = () => {
    let sum = 0;
    let cnt = 0;
    const from = V.today() - 14;
    for (const d of V.state.logs.values()) {
      if (d.idx < from) continue;
      for (const e of d.entries) {
        if (e.ms) {
          sum += e.ms;
          cnt++;
        }
      }
    }
    return cnt >= 10 ? sum / cnt : 9000;
  };

  function todayDone() {
    const day = V.state.logs.get(V.dayKey(V.today()));
    return day ? day.entries.length : 0;
  }

  function goalRing(done, goal) {
    const pct = goal ? Math.min(1, done / goal) : 0;
    const r = 30;
    const c = 2 * Math.PI * r;
    return (
      '<svg class="goal-ring" viewBox="0 0 72 72" width="72" height="72" role="img" aria-label="Meta diaria: ' +
      done +
      ' de ' +
      goal +
      ' fichas">' +
      '<circle cx="36" cy="36" r="' +
      r +
      '" class="ring-track" fill="none" stroke-width="7"/>' +
      (pct > 0 ? '<circle cx="36" cy="36" r="' : '<circle hidden cx="36" cy="36" r="') +
      r +
      '" class="ring-fill" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="' +
      (c * pct).toFixed(1) +
      ' ' +
      c.toFixed(1) +
      '" transform="rotate(-90 36 36)"/>' +
      '<text x="36" y="35" text-anchor="middle" class="ring-num">' +
      done +
      '</text><text x="36" y="49" text-anchor="middle" class="ring-sub">de ' +
      goal +
      '</text></svg>'
    );
  }

  function greeting() {
    const h = new Date().getHours();
    return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  }

  function countsHtml(c) {
    return (
      '<span class="counts">' +
      '<span class="c-new' + (c.newCount ? '' : ' zero') + '" title="Nuevas">' + c.newCount + '</span>' +
      '<span class="c-learn' + (c.learnCount ? '' : ' zero') + '" title="En aprendizaje">' + c.learnCount + '</span>' +
      '<span class="c-due' + (c.dueCount ? '' : ' zero') + '" title="Para repasar">' + c.dueCount + '</span>' +
      '</span>'
    );
  }

  V.demoCardHtml = () =>
    '<div class="demo-stack" aria-hidden="true">' +
    '<article class="flash flash-demo is-revealed">' +
    '<div class="flash-top"><span class="kind-chip">EN → ES</span><span class="state-chip state-new">Nueva</span></div>' +
    '<div class="flash-front"><h2 class="headword">thorough</h2><div class="phon"><span class="speak-btn">' +
    V.icon('speaker', 18) +
    '</span><span class="ipa">/ˈθɝːoʊ/</span><span class="pos">adj.</span><span class="level">B2</span></div></div>' +
    '<div class="flash-back"><p class="answer-main">minucioso, exhaustivo</p><div class="entry"><p class="definition">Done carefully and completely, paying attention to every detail.</p>' +
    '<blockquote class="example"><p>We need a <mark>thorough</mark> review of the patient’s medications.</p><p class="example-tr">Necesitamos una revisión minuciosa de la medicación del paciente.</p></blockquote>' +
    '<p class="mnemonic">' +
    V.icon('bulb', 16) +
    '<span>Se parece a «through» (de principio a fin): revisar algo de cabo a rabo.</span></p></div></div>' +
    '</article>' +
    '<div class="ratings ratings-demo"><span class="rate rate-1"><span class="rate-ivl">1 min</span><span class="rate-label">Otra vez</span></span><span class="rate rate-2"><span class="rate-ivl">6 min</span><span class="rate-label">Difícil</span></span><span class="rate rate-3"><span class="rate-ivl">10 min</span><span class="rate-label">Bien</span></span><span class="rate rate-4"><span class="rate-ivl">4 d</span><span class="rate-label">Fácil</span></span></div>' +
    '<p class="demo-caption">Ejemplo de ficha. Los botones muestran cuándo volverá a salir según cómo la recuerdes.</p>' +
    '</div>';

  function emptyHtml() {
    return (
      '<section class="page home home-empty">' +
      '<div class="welcome">' +
      '<div class="welcome-text">' +
      '<p class="eyebrow">Vocablo</p>' +
      '<h1>Tu vocabulario de inglés, repasado justo antes de que se te olvide.</h1>' +
      '<p class="lead">Tú creas las fichas. Vocablo decide cuándo repasar cada una con el mismo sistema de repetición espaciada de Anki (SM-2) o con FSRS, el algoritmo moderno.</p>' +
      '<div class="row-actions">' +
      '<button class="btn btn-primary btn-lg" data-act="add">' +
      V.icon('plus', 18) +
      'Crear mi primera ficha</button>' +
      '<button class="btn btn-ghost btn-lg" data-act="sample">Probar con 20 palabras de ejemplo</button>' +
      '</div>' +
      '<ol class="how">' +
      '<li><span><strong>Crea</strong> la ficha: escribe la palabra y deja que Claude complete traducción, IPA, ejemplo y un truco para recordarla.</span></li>' +
      '<li><span><strong>Repasa</strong> cada día lo que toca. Intenta recordar antes de girar la ficha.</span></li>' +
      '<li><span><strong>Responde con honestidad</strong>: Otra vez, Difícil, Bien o Fácil. Eso fija el próximo repaso.</span></li>' +
      '</ol>' +
      '</div>' +
      V.demoCardHtml() +
      '</div>' +
      '</section>'
    );
  }

  V.routes.hoy = (main) => {
    if (!V.state.notes.size) {
      main.innerHTML = emptyHtml();
      bind(main.firstElementChild);
      return;
    }
    const st = V.settings();
    const all = V.queueSummary(null);
    const total = all.newCount + all.learnCount + all.dueCount;
    const done = todayDone();
    const streak = V.streak();
    const estMin = Math.max(1, Math.round(((all.newCount * 3 + all.learnCount * 1.5 + all.dueCount * 1.15) * V.avgAnswerMs()) / 60000));
    const date = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    const leeches = Array.from(V.state.notes.values()).filter((n) => (n.tags || []).includes('difícil')).length;
    let words = 0;
    const perDeck = {};
    for (const n of V.state.notes.values()) {
      perDeck[n.deckId] = (perDeck[n.deckId] || 0) + 1;
      words++;
    }

    const deckRows = V.state.meta.decks
      .map((d) => {
        const c = V.queueSummary(new Set([d.id]));
        const count = perDeck[d.id] || 0;
        return (
          '<li class="deck-row">' +
          '<span class="deck-dot" style="background:' +
          V.deckColor(d) +
          '"></span>' +
          '<button class="deck-main" data-act="study" data-deck="' +
          V.esc(d.id) +
          '"' +
          (count ? '' : ' disabled') +
          '><span class="deck-name">' +
          V.esc(d.name) +
          '</span><span class="deck-sub">' +
          V.num(count) +
          ' ' +
          V.plural(count, 'palabra', 'palabras') +
          '</span></button>' +
          countsHtml(c) +
          '<button class="icon-btn" data-act="deck-menu" data-deck="' +
          V.esc(d.id) +
          '" aria-label="Opciones del mazo ' +
          V.esc(d.name) +
          '">' +
          V.icon('more') +
          '</button>' +
          '</li>'
        );
      })
      .join('');

    main.innerHTML =
      '<section class="page home">' +
      '<header class="home-head">' +
      '<div><p class="eyebrow">' +
      V.esc(date) +
      '</p><h1>' +
      greeting() +
      '</h1></div>' +
      '<div class="home-badges">' +
      '<div class="streak' +
      (streak.n ? '' : ' streak-off') +
      '" title="Mejor racha: ' +
      streak.best +
      ' días">' +
      V.icon('flame', 22) +
      '<span><strong>' +
      streak.n +
      '</strong> ' +
      V.plural(streak.n, 'día', 'días') +
      '<small>' +
      (streak.studiedToday ? 'de racha' : streak.n ? 'repasa hoy para mantenerla' : 'empieza tu racha hoy') +
      '</small></span></div>' +
      goalRing(done, st.dailyGoal) +
      '</div>' +
      '</header>' +
      '<div class="today">' +
      '<div class="today-counts">' +
      '<div><span class="big c-new">' +
      all.newCount +
      '</span><span class="lbl">nuevas</span></div>' +
      '<div><span class="big c-learn">' +
      all.learnCount +
      '</span><span class="lbl">aprendiendo</span></div>' +
      '<div><span class="big c-due">' +
      all.dueCount +
      '</span><span class="lbl">para repasar</span></div>' +
      '</div>' +
      '<div class="today-cta">' +
      (total
        ? '<button class="btn btn-primary btn-lg" data-act="study-all">Estudiar ahora ' +
          V.icon('arrowRight', 18) +
          '</button><span class="muted small">Unos ' +
          estMin +
          ' min</span>'
        : '<p class="all-done">' +
          V.icon('check', 18) +
          ' Todo al día. Vuelve mañana o añade palabras nuevas.</p>') +
      '</div>' +
      '</div>' +
      '<section class="decks">' +
      '<div class="section-head"><h2>Mazos</h2><span class="muted small">' +
      V.num(words) +
      ' ' +
      V.plural(words, 'palabra', 'palabras') +
      '</span><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-act="new-deck">' +
      V.icon('plus', 16) +
      'Nuevo mazo</button></div>' +
      '<p class="legend-counts small muted"><span class="c-new">nuevas</span> · <span class="c-learn">aprendiendo</span> · <span class="c-due">para repasar</span></p>' +
      '<ul class="deck-list">' +
      deckRows +
      '</ul>' +
      '</section>' +
      (leeches
        ? '<aside class="notice">' +
          V.icon('warning', 18) +
          '<p><strong>' +
          leeches +
          ' ' +
          V.plural(leeches, 'palabra se te resiste', 'palabras se te resisten') +
          '.</strong> Añadirles una imagen, una mnemotecnia o un ejemplo propio suele desatascarlas.</p><button class="btn btn-ghost btn-sm" data-act="leeches">Ver</button></aside>'
        : '') +
      '</section>';
    bind(main.firstElementChild);
  };

  async function deckMenu(deck) {
    const count = Array.from(V.state.notes.values()).filter((n) => n.deckId === deck.id).length;
    const choice = await V.modal({
      title: deck.name,
      body: '<p class="muted">' + V.num(count) + ' ' + V.plural(count, 'palabra', 'palabras') + '</p>',
      actions: [
        { label: 'Práctica libre', kind: 'ghost', value: 'cram' },
        { label: 'Añadir palabra', kind: 'ghost', value: 'add' },
        { label: 'Renombrar', kind: 'ghost', value: 'rename' },
        { label: 'Eliminar', kind: 'danger', value: 'delete' },
      ],
    });
    if (choice === 'cram') {
      const items = Array.from(V.allCards(new Set([deck.id]))).filter((x) => !x.card.suspended);
      if (!items.length) V.toast('Este mazo no tiene fichas.');
      else V.startCram(items, deck.name + ' · práctica');
    } else if (choice === 'add') {
      V.go('anadir', { deckId: deck.id });
    } else if (choice === 'rename') {
      const name = await V.prompt('Renombrar mazo', deck.name, { label: 'Nombre del mazo' });
      if (name) {
        deck.name = name;
        V.saveMeta();
        V.render();
      }
    } else if (choice === 'delete') {
      if (V.state.meta.decks.length === 1) {
        V.toast('No puedes eliminar el único mazo. Crea otro primero.', { tone: 'bad' });
        return;
      }
      const ok = await V.confirm(
        'Se eliminará el mazo «' + V.esc(deck.name) + '»' + (count ? ' y sus ' + count + ' ' + V.plural(count, 'palabra', 'palabras') + ' con todo su progreso' : '') + '.',
        { ok: 'Eliminar mazo', danger: true, title: 'Eliminar mazo' }
      );
      if (!ok) return;
      for (const n of Array.from(V.state.notes.values())) if (n.deckId === deck.id) V.removeNote(n.id);
      V.state.meta.decks = V.state.meta.decks.filter((d) => d.id !== deck.id);
      V.saveMeta();
      V.toast('Mazo eliminado');
      V.render();
    }
  }

  function bind(section) {
    section.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'add') V.go('anadir');
      else if (act === 'sample') {
        const n = V.loadSampleDeck();
        V.toast('Añadidas ' + n + ' palabras de ejemplo');
        V.render();
      } else if (act === 'study-all') V.startStudy(null);
      else if (act === 'study') V.startStudy(new Set([b.dataset.deck]));
      else if (act === 'deck-menu') deckMenu(V.deck(b.dataset.deck));
      else if (act === 'new-deck') {
        const name = await V.prompt('Nuevo mazo', '', { label: 'Nombre del mazo', ok: 'Crear' });
        if (name) {
          V.createDeck(name);
          V.render();
        }
      } else if (act === 'leeches') V.go('explorar', { state: 'leech' });
    });
  }
})();
