/* Vocablo · explorar palabras y ver su información */
(function () {
  'use strict';
  const V = window.V;
  const PAGE = 150;

  V.dueLabel = (card) => {
    if (card.suspended) return 'suspendida';
    if (card.type === 'new') return 'nueva';
    const now = Date.now();
    if (card.type === 'learning' || card.type === 'relearning') {
      const ms = card.due - now;
      return ms <= 0 ? 'ahora' : 'en ' + SRS.formatInterval(ms);
    }
    const days = SRS.dayIndex(card.due, V.settings().dayStartHour) - V.today();
    if (days < 0) return 'vencida hace ' + -days + ' d';
    if (days === 0) return 'hoy';
    if (days === 1) return 'mañana';
    return 'en ' + SRS.formatInterval(days * SRS.DAY);
  };

  const STATE_LABEL = {
    new: 'Nueva',
    learning: 'Aprendiendo',
    young: 'En repaso',
    mature: 'Madura',
    suspended: 'Suspendida',
  };

  function noteState(note) {
    const order = ['learning', 'young', 'new', 'mature', 'suspended'];
    const states = V.KIND_ORDER.filter((k) => note.cards[k]).map((k) => V.cardState(note.cards[k]));
    if (states.every((s) => s === 'suspended')) return 'suspended';
    const active = states.filter((s) => s !== 'suspended');
    if (active.every((s) => s === 'mature')) return 'mature';
    if (active.every((s) => s === 'new')) return 'new';
    for (const s of order) if (active.includes(s)) return s;
    return 'new';
  }
  V.noteState = noteState;

  function nextDue(note) {
    let best = Infinity;
    for (const k of V.KIND_ORDER) {
      const c = note.cards[k];
      if (!c || c.suspended || c.type === 'new') continue;
      best = Math.min(best, c.due);
    }
    return best;
  }

  function lapses(note) {
    return V.KIND_ORDER.reduce((s, k) => s + ((note.cards[k] && note.cards[k].lapses) || 0), 0);
  }

  V.routes.explorar = (main) => {
    const p = V.state.params || {};
    const f = (V.state.browse = Object.assign(
      { q: '', deck: '', state: '', sort: 'recent', limit: PAGE },
      V.state.browse || {},
      p.state ? { state: p.state, q: '' } : {}
    ));
    main.innerHTML =
      '<section class="page browse">' +
      '<header class="page-head"><div><p class="eyebrow">Explorar</p><h1>Tus palabras</h1></div><p class="muted small" id="browse-count"></p></header>' +
      '<div class="filters">' +
      '<label class="search">' +
      V.icon('search', 18) +
      '<span class="sr-only">Buscar</span><input id="flt-q" type="search" placeholder="Buscar en inglés o en español" value="' +
      V.esc(f.q) +
      '" autocomplete="off"></label>' +
      '<label class="select-wrap"><span class="sr-only">Mazo</span><select id="flt-deck"><option value="">Todos los mazos</option>' +
      V.state.meta.decks.map((d) => '<option value="' + V.esc(d.id) + '"' + (f.deck === d.id ? ' selected' : '') + '>' + V.esc(d.name) + '</option>').join('') +
      '</select></label>' +
      '<label class="select-wrap"><span class="sr-only">Estado</span><select id="flt-state">' +
      [
        ['', 'Todos los estados'],
        ['new', 'Nuevas'],
        ['learning', 'Aprendiendo'],
        ['young', 'En repaso'],
        ['mature', 'Maduras'],
        ['suspended', 'Suspendidas'],
        ['leech', 'Difíciles'],
        ['due', 'Para hoy'],
      ]
        .map(([v, l]) => '<option value="' + v + '"' + (f.state === v ? ' selected' : '') + '>' + l + '</option>')
        .join('') +
      '</select></label>' +
      '<label class="select-wrap"><span class="sr-only">Orden</span><select id="flt-sort">' +
      [
        ['recent', 'Añadidas recientemente'],
        ['alpha', 'A–Z'],
        ['due', 'Próximo repaso'],
        ['lapses', 'Más fallos'],
      ]
        .map(([v, l]) => '<option value="' + v + '"' + (f.sort === v ? ' selected' : '') + '>' + l + '</option>')
        .join('') +
      '</select></label>' +
      '</div>' +
      '<div id="browse-actions" class="browse-actions"></div>' +
      '<ul class="word-list" id="word-list"></ul>' +
      '<div id="browse-more"></div>' +
      '</section>';

    const section = main.firstElementChild;
    const list = V.$('#word-list');
    let current = [];

    const apply = () => {
      const q = V.norm(f.q);
      const tomorrow = V.dayStart(V.today() + 1);
      let notes = Array.from(V.state.notes.values()).filter((n) => {
        if (f.deck && n.deckId !== f.deck) return false;
        if (q) {
          const hay = V.norm([n.word, n.translation, n.definition, n.example, (n.tags || []).join(' ')].join(' '));
          if (!hay.includes(q)) return false;
        }
        if (f.state === 'leech') return (n.tags || []).includes('difícil');
        if (f.state === 'due')
          return V.KIND_ORDER.some((k) => n.cards[k] && !n.cards[k].suspended && n.cards[k].type !== 'new' && n.cards[k].due < tomorrow);
        if (f.state === 'suspended') return V.KIND_ORDER.some((k) => n.cards[k] && n.cards[k].suspended);
        if (f.state) return noteState(n) === f.state;
        return true;
      });
      const by = {
        recent: (a, b) => b.createdAt - a.createdAt,
        alpha: (a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }),
        due: (a, b) => nextDue(a) - nextDue(b),
        lapses: (a, b) => lapses(b) - lapses(a) || a.word.localeCompare(b.word),
      }[f.sort];
      notes.sort(by);
      current = notes;
      V.$('#browse-count').textContent =
        V.num(notes.length) + ' de ' + V.num(V.state.notes.size) + ' ' + V.plural(V.state.notes.size, 'palabra', 'palabras');
      const shown = notes.slice(0, f.limit);
      list.innerHTML = shown.length
        ? shown
            .map((n) => {
              const stt = noteState(n);
              const nd = nextDue(n);
              const due = nd === Infinity ? (stt === 'suspended' ? 'suspendida' : 'sin repasar') : V.dueLabel({ type: 'review', due: nd });
              const deck = V.deck(n.deckId);
              return (
                '<li><button class="word-row" data-open="' +
                V.esc(n.id) +
                '">' +
                '<span class="w-main"><span class="w-word">' +
                V.esc(n.word) +
                '</span>' +
                (n.ipa ? '<span class="ipa w-ipa">' + V.esc(n.ipa) + '</span>' : '') +
                '<span class="w-tr">' +
                V.esc(n.translation) +
                '</span></span>' +
                '<span class="w-meta">' +
                (!f.deck && deck ? '<span class="deck-chip"><i style="background:' + V.deckColor(deck) + '"></i>' + V.esc(deck.name) + '</span>' : '') +
                '<span class="state-pill state-' +
                stt +
                '">' +
                STATE_LABEL[stt] +
                '</span><span class="w-due">' +
                V.esc(due) +
                '</span></span>' +
                '</button></li>'
              );
            })
            .join('')
        : '<li class="empty-list">' +
          (V.state.notes.size
            ? 'Ninguna palabra coincide con estos filtros.'
            : 'Aún no tienes palabras. <button class="link-btn" data-go="anadir">Añade la primera</button>.') +
          '</li>';
      V.$('#browse-more').innerHTML =
        notes.length > f.limit
          ? '<button class="btn btn-ghost" data-more>Mostrar ' + Math.min(PAGE, notes.length - f.limit) + ' más</button>'
          : '';
      V.$('#browse-actions').innerHTML = notes.length
        ? '<button class="btn btn-ghost btn-sm" data-act="cram">' +
          V.icon('bolt', 16) +
          'Practicar estas ' +
          V.num(notes.length) +
          '</button>'
        : '';
    };

    let t = null;
    V.$('#flt-q').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => {
        f.q = e.target.value;
        f.limit = PAGE;
        apply();
      }, 120);
    });
    for (const [id, key] of [
      ['flt-deck', 'deck'],
      ['flt-state', 'state'],
      ['flt-sort', 'sort'],
    ]) {
      V.$('#' + id).addEventListener('change', (e) => {
        f[key] = e.target.value;
        f.limit = PAGE;
        apply();
      });
    }
    section.addEventListener('click', (e) => {
      const o = e.target.closest('[data-open]');
      if (o) {
        const note = V.state.notes.get(o.dataset.open);
        if (note) V.showNoteInfo(note, () => apply());
        return;
      }
      if (e.target.closest('[data-more]')) {
        f.limit += PAGE;
        apply();
        return;
      }
      const g = e.target.closest('[data-go]');
      if (g) V.go(g.dataset.go);
      const a = e.target.closest('[data-act="cram"]');
      if (a) {
        const items = [];
        for (const n of current) for (const k of V.KIND_ORDER) if (n.cards[k] && !n.cards[k].suspended) items.push({ note: n, kind: k });
        if (items.length) V.startCram(items, 'Práctica · ' + current.length + ' ' + V.plural(current.length, 'palabra', 'palabras'));
      }
    });
    apply();
    if (p.open && V.state.notes.get(p.open)) V.showNoteInfo(V.state.notes.get(p.open), () => apply());
  };

  // ------------------------------------------------------ ficha detallada
  function cardRows(note) {
    const fsrs = V.settings().algorithm === 'fsrs';
    return V.KIND_ORDER.filter((k) => note.cards[k])
      .map((k) => {
        const c = note.cards[k];
        const r = SRS.currentRetrievability(c, Date.now());
        const stt = V.cardState(c);
        return (
          '<tr><th scope="row">' +
          V.esc(V.KINDS[k].label) +
          '</th><td><span class="state-pill state-' +
          stt +
          '">' +
          STATE_LABEL[stt] +
          '</span></td><td>' +
          V.esc(V.dueLabel(c)) +
          '</td><td class="num">' +
          (c.type === 'review' || c.type === 'relearning' ? SRS.formatInterval(c.ivl * SRS.DAY) : '—') +
          '</td><td class="num">' +
          (fsrs
            ? c.difficulty != null
              ? 'D ' + c.difficulty.toFixed(1) + ' · S ' + (c.stability < 1 ? c.stability.toFixed(2) : Math.round(c.stability)) + ' d'
              : '—'
            : c.ease
              ? Math.round(c.ease * 100) + ' %'
              : '—') +
          '</td><td class="num">' +
          (r == null ? '—' : Math.round(r * 100) + ' %') +
          '</td><td class="num">' +
          (c.reps || 0) +
          '</td><td class="num">' +
          (c.lapses || 0) +
          '</td></tr>'
        );
      })
      .join('');
  }

  V.showNoteInfo = async (note, onChange) => {
    const deck = V.deck(note.deckId);
    const fsrs = V.settings().algorithm === 'fsrs';
    const anySusp = V.KIND_ORDER.some((k) => note.cards[k] && note.cards[k].suspended);
    const body =
      '<div class="info">' +
      '<div class="info-entry">' +
      V.frontHtml(note, 'recognition', {}) +
      V.backHtml(note, 'recognition', {}) +
      '</div>' +
      '<p class="muted small">Mazo: ' +
      V.esc(deck ? deck.name : '—') +
      ' · Añadida el ' +
      new Date(note.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ((note.tags || []).length ? ' · Etiquetas: ' + V.esc(note.tags.join(', ')) : '') +
      '</p>' +
      '<div class="table-wrap"><table class="info-table"><thead><tr><th>Ficha</th><th>Estado</th><th>Próximo</th><th class="num">Intervalo</th><th class="num">' +
      (fsrs ? 'Memoria' : 'Facilidad') +
      '</th><th class="num" title="Probabilidad estimada de recordarla ahora">Recuerdo</th><th class="num">Repasos</th><th class="num">Fallos</th></tr></thead><tbody>' +
      cardRows(note) +
      '</tbody></table></div>' +
      '</div>';
    const choice = await V.modal({
      title: note.word,
      body,
      wide: true,
      actions: [
        { label: 'Eliminar', kind: 'danger-text', value: 'delete' },
        { label: 'Reiniciar progreso', kind: 'ghost', value: 'reset' },
        { label: anySusp ? 'Reactivar' : 'Suspender', kind: 'ghost', value: 'suspend' },
        { label: 'Practicar', kind: 'ghost', value: 'cram' },
        { label: 'Editar', kind: 'primary', value: 'edit' },
      ],
      onMount: (w) => {
        V.$$('[data-act="speak"]', w).forEach((b) => b.addEventListener('click', () => V.speech.speak(note.word)));
        V.$$('[data-act="speak-example"]', w).forEach((b) => b.addEventListener('click', () => V.speech.speak(note.example)));
      },
    });
    if (choice === 'edit') {
      V.go('anadir', { noteId: note.id, returnTo: V.state.view === 'estudiar' ? 'estudiar' : 'explorar' });
    } else if (choice === 'suspend') {
      for (const k of V.KIND_ORDER) if (note.cards[k]) note.cards[k].suspended = !anySusp;
      V.saveNote(note);
      V.toast(anySusp ? 'Fichas reactivadas' : 'Fichas suspendidas: no saldrán en los repasos');
      onChange && onChange();
    } else if (choice === 'reset') {
      const ok = await V.confirm('«' + V.esc(note.word) + '» volverá a ser nueva y perderá su progreso de repaso.', {
        ok: 'Reiniciar',
        danger: true,
      });
      if (ok) {
        for (const k of V.KIND_ORDER) if (note.cards[k]) note.cards[k] = SRS.newCard();
        note.tags = (note.tags || []).filter((t) => t !== 'difícil');
        V.saveNote(note);
        V.toast('Progreso reiniciado');
        onChange && onChange();
      }
    } else if (choice === 'delete') {
      const ok = await V.confirm('Se eliminará «' + V.esc(note.word) + '» con todas sus fichas.', { ok: 'Eliminar', danger: true });
      if (ok) {
        V.removeNote(note.id);
        V.toast('Palabra eliminada');
        onChange && onChange();
      }
    } else if (choice === 'cram') {
      const items = V.KIND_ORDER.filter((k) => note.cards[k]).map((k) => ({ note, kind: k }));
      V.startCram(items, note.word + ' · práctica');
    }
  };
})();
