/* Vocablo · núcleo: utilidades, estado, guardado, cola de estudio, voz */
(function () {
  'use strict';
  const V = (window.V = window.V || {});

  // ------------------------------------------------------------ utilidades
  V.$ = (sel, el) => (el || document).querySelector(sel);
  V.$$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  V.esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  V.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  V.clone = (x) => JSON.parse(JSON.stringify(x));
  V.num = (n) => Number(n || 0).toLocaleString('es');
  V.plural = (n, one, many) => (n === 1 ? one : many);
  V.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  V.norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, "'")
      .replace(/[^a-z0-9' -]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  V.hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  V.reduceMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- iconos
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chart: '<path d="M3 20h18"/><path d="M6 16v-5M11 16V5M16 16v-8M21 16v-3"/>',
    sliders:
      '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    speaker:
      '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    flame:
      '<path d="M12 3c.8 3.3 5 5.2 5 10.2a5 5 0 0 1-10 0c0-2.4 1.3-4 2.4-5 .3 1.6 1 2.6 2.1 3 0-3-1.2-5.4.5-8.2z"/>',
    more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    sparkle:
      '<path d="M12 3.5 13.7 8.3 18.5 10l-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    bulb:
      '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    deck: '<rect x="3" y="7" width="14" height="13" rx="2"/><path d="M7 7V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 10.5a3.8 3.8 0 0 1-.5 7.5z"/>',
    device: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    keyboard:
      '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    warning: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
  };
  V.icon = (name, size) =>
    '<svg class="i" width="' +
    (size || 20) +
    '" height="' +
    (size || 20) +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (ICONS[name] || '') +
    '</svg>';

  // ----------------------------------------------------------- constantes
  V.KINDS = {
    recognition: {
      label: 'Inglés → Español',
      short: 'EN → ES',
      desc: 'Ves la palabra en inglés y recuerdas qué significa.',
    },
    production: {
      label: 'Español → Inglés',
      short: 'ES → EN',
      desc: 'Ves el significado y recuerdas la palabra en inglés. Es la que más cuesta y la que más enseña.',
    },
    listening: {
      label: 'Escucha',
      short: 'Oído',
      desc: 'Oyes la palabra (voz del sistema) y la reconoces o la escribes.',
    },
    cloze: {
      label: 'Completar la frase',
      short: 'Contexto',
      desc: 'Ves tu frase de ejemplo con un hueco y escribes la palabra que falta.',
    },
  };
  V.KIND_ORDER = ['recognition', 'production', 'listening', 'cloze'];

  V.POS = {
    noun: 'n.',
    verb: 'v.',
    adjective: 'adj.',
    adverb: 'adv.',
    'phrasal verb': 'phr. v.',
    idiom: 'idiom',
    expression: 'expr.',
    preposition: 'prep.',
    conjunction: 'conj.',
    pronoun: 'pron.',
    interjection: 'interj.',
  };
  V.POS_ES = {
    noun: 'sustantivo',
    verb: 'verbo',
    adjective: 'adjetivo',
    adverb: 'adverbio',
    'phrasal verb': 'phrasal verb',
    idiom: 'modismo',
    expression: 'expresión',
    preposition: 'preposición',
    conjunction: 'conjunción',
    pronoun: 'pronombre',
    interjection: 'interjección',
  };

  V.DECK_COLORS = ['#2a78d6', '#d4571f', '#1a9a6c', '#c48a00', '#c2477a', '#6250d6', '#3c7f2f', '#c93b3b'];

  V.DEFAULT_SETTINGS = {
    // límites diarios (por mazo, como en Anki)
    newPerDay: 20,
    reviewsPerDay: 200,
    dailyGoal: 40,
    // planificador
    algorithm: 'sm2',
    learningSteps: [1, 10],
    relearningSteps: [10],
    graduatingInterval: 1,
    easyInterval: 4,
    startingEase: 2.5,
    easyBonus: 1.3,
    hardInterval: 1.2,
    intervalModifier: 1,
    newInterval: 0,
    minimumInterval: 1,
    maximumInterval: 36500,
    leechThreshold: 8,
    leechAction: 'tag',
    desiredRetention: 0.9,
    dayStartHour: 4,
    fuzz: true,
    // cola
    buryNotes: true,
    newOrder: 'added',
    newMix: 'mix',
    learnAheadMin: 20,
    // fichas
    cardKinds: { recognition: true, production: true, listening: false, cloze: false },
    typeAnswer: false,
    // voz
    accent: 'en-US',
    voiceURI: '',
    ttsRate: 0.9,
    autoPlay: true,
    // apariencia
    theme: 'system',
  };

  const SRS_KEYS = [
    'algorithm',
    'learningSteps',
    'relearningSteps',
    'graduatingInterval',
    'easyInterval',
    'startingEase',
    'easyBonus',
    'hardInterval',
    'intervalModifier',
    'newInterval',
    'minimumInterval',
    'maximumInterval',
    'leechThreshold',
    'desiredRetention',
    'dayStartHour',
    'fuzz',
  ];

  // --------------------------------------------------------------- estado
  V.state = {
    meta: null,
    notes: new Map(),
    logs: new Map(),
    backend: null,
    ready: false,
    sync: 'saved',
    params: {},
  };

  V.settings = () => V.state.meta.settings;
  V.schedCfg = () => {
    const s = V.settings();
    const cfg = {};
    for (const k of SRS_KEYS) cfg[k] = s[k];
    return cfg;
  };

  V.freshMeta = () => ({
    v: 1,
    createdAt: Date.now(),
    decks: [{ id: 'general', name: 'General', color: 0, createdAt: Date.now() }],
    settings: V.clone(V.DEFAULT_SETTINGS),
    extraNew: null,
  });

  V.normalizeMeta = (meta) => {
    const m = meta && typeof meta === 'object' ? V.clone(meta) : V.freshMeta();
    m.settings = Object.assign(V.clone(V.DEFAULT_SETTINGS), m.settings || {});
    m.settings.cardKinds = Object.assign(
      V.clone(V.DEFAULT_SETTINGS.cardKinds),
      (meta && meta.settings && meta.settings.cardKinds) || {}
    );
    if (!Array.isArray(m.decks) || !m.decks.length) m.decks = V.freshMeta().decks;
    return m;
  };

  // ------------------------------------------------------------- días
  V.now = () => Date.now();
  V.today = () => SRS.dayIndex(Date.now(), V.settings().dayStartHour);
  V.dayStart = (idx) => SRS.dayStart(idx, V.settings().dayStartHour);
  V.dayKey = (idx) => {
    const d = new Date(V.dayStart(idx));
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };

  // ------------------------------------------------------------- guardado
  V.saveMeta = () => V.state.backend && V.state.backend.putMeta(V.state.meta);
  V.saveNote = (note, touch) => {
    if (touch !== false) note.updatedAt = Date.now();
    V.state.notes.set(note.id, note);
    V.state.backend && V.state.backend.putNote(note);
  };
  V.removeNote = (id) => {
    V.state.notes.delete(id);
    V.state.backend && V.state.backend.deleteNote(id);
  };
  V.logDay = (idx) => {
    const key = V.dayKey(idx);
    let day = V.state.logs.get(key);
    if (!day) {
      day = { day: key, idx, entries: [] };
      V.state.logs.set(key, day);
    } else if (Object.isFrozen(day) || Object.isFrozen(day.entries)) {
      day = V.clone(day);
      V.state.logs.set(key, day);
    }
    return day;
  };
  V.saveLogDay = (day) => V.state.backend && V.state.backend.putLog(day);

  V.deck = (id) => V.state.meta.decks.find((d) => d.id === id);
  V.deckColor = (deck) => V.DECK_COLORS[(deck && deck.color) % V.DECK_COLORS.length] || V.DECK_COLORS[0];

  // ---------------------------------------------------------- notas
  V.createNote = (fields, deckId, kinds) => {
    const now = Date.now();
    const note = Object.assign(
      {
        id: 'n' + V.uid(),
        deckId,
        createdAt: now,
        updatedAt: now,
        word: '',
        translation: '',
        pos: '',
        ipa: '',
        definition: '',
        example: '',
        exampleTr: '',
        synonyms: '',
        mnemonic: '',
        notes: '',
        level: '',
        tags: [],
        image: '',
        cards: {},
      },
      fields
    );
    note.cards = {};
    for (const k of V.KIND_ORDER) {
      if (kinds[k] && V.kindPossible(note, k)) note.cards[k] = SRS.newCard();
    }
    if (!Object.keys(note.cards).length) note.cards.recognition = SRS.newCard();
    return note;
  };

  V.kindPossible = (note, kind) => (kind === 'cloze' ? !!V.clozeMatch(note) : true);

  /** Busca la palabra (o una forma flexionada) dentro del ejemplo. */
  V.clozeMatch = (note) => {
    const word = String(note.word || '').trim();
    const ex = String(note.example || '');
    if (!word || !ex) return null;
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const base = word.replace(/^to\s+/i, '');
    const attempts = [escape(base)];
    if (!/\s/.test(base)) {
      attempts.push(escape(base) + "[a-z']{0,4}");
      if (base.length > 4 && /[ey]$/i.test(base)) attempts.push(escape(base.slice(0, -1)) + '[a-z]{1,4}');
    } else {
      // phrasal verbs: permite flexionar la primera palabra (give up → gave/given up no, gives up sí)
      const parts = base.split(/\s+/);
      attempts.push(escape(parts[0]) + "[a-z']{0,4}\\s+" + parts.slice(1).map(escape).join('\\s+'));
    }
    for (const a of attempts) {
      const m = new RegExp('(^|[^A-Za-z])(' + a + ')(?![A-Za-z])', 'i').exec(ex);
      if (m) {
        const start = m.index + m[1].length;
        return { start, end: start + m[2].length, text: m[2] };
      }
    }
    return null;
  };

  V.allCards = function* (filterDeckIds) {
    for (const note of V.state.notes.values()) {
      if (filterDeckIds && !filterDeckIds.has(note.deckId)) continue;
      for (const kind of V.KIND_ORDER) {
        const card = note.cards[kind];
        if (card) yield { note, kind, card };
      }
    }
  };

  V.cardState = (card) => {
    if (card.suspended) return 'suspended';
    if (card.type === 'new') return 'new';
    if (card.type === 'learning' || card.type === 'relearning') return 'learning';
    return card.ivl >= 21 ? 'mature' : 'young';
  };

  // ------------------------------------------------------ cola de estudio
  function todayCounts(today) {
    const day = V.state.logs.get(V.dayKey(today));
    const byDeck = {};
    const notesSeen = new Set();
    let total = 0;
    if (day) {
      for (const e of day.entries) {
        if (e.cram) continue;
        const d = (byDeck[e.d] = byDeck[e.d] || { newDone: 0, revDone: 0 });
        if (e.t === 'new') d.newDone++;
        else if (e.t === 'review') d.revDone++;
        notesSeen.add(e.n);
        total++;
      }
    }
    return { byDeck, notesSeen, total };
  }
  V.todayCounts = todayCounts;

  V.extraNewToday = () => {
    const x = V.state.meta.extraNew;
    return x && x.day === V.today() ? x.n : 0;
  };

  /**
   * Fichas disponibles hoy en los mazos indicados, respetando los límites
   * diarios, el orden de Anki y el enterrado de fichas hermanas.
   */
  V.queue = (deckIds, now) => {
    now = now || Date.now();
    const s = V.settings();
    const today = SRS.dayIndex(now, s.dayStartHour);
    const tomorrow = SRS.dayStart(today + 1, s.dayStartHour);
    const counts = todayCounts(today);
    const learn = [];
    const reviews = [];
    const news = [];
    for (const note of V.state.notes.values()) {
      if (deckIds && !deckIds.has(note.deckId)) continue;
      for (const kind of V.KIND_ORDER) {
        const card = note.cards[kind];
        if (!card || card.suspended) continue;
        if (card.buriedUntil && card.buriedUntil > now) continue;
        const item = { note, kind, card };
        if (card.type === 'learning' || card.type === 'relearning') {
          if (card.due < tomorrow) learn.push(item);
        } else if (card.type === 'review') {
          if (card.due < tomorrow) reviews.push(item);
        } else if (card.type === 'new') {
          news.push(item);
        }
      }
    }
    const tie = (it) => V.hash(it.note.id + it.kind + today);
    reviews.sort((a, b) => a.card.due - b.card.due || tie(a) - tie(b));
    if (s.newOrder === 'random') news.sort((a, b) => tie(a) - tie(b));
    else
      news.sort(
        (a, b) =>
          a.note.createdAt - b.note.createdAt ||
          V.KIND_ORDER.indexOf(a.kind) - V.KIND_ORDER.indexOf(b.kind)
      );

    // Enterrar hermanas: una sola ficha por palabra y día (las de aprendizaje no cuentan).
    const learningNotes = new Set(learn.map((x) => x.note.id));
    const usedNotes = new Set();
    const bury = (list) =>
      !s.buryNotes
        ? list
        : list.filter((it) => {
            const id = it.note.id;
            if (counts.notesSeen.has(id) || learningNotes.has(id) || usedNotes.has(id)) return false;
            usedNotes.add(id);
            return true;
          });
    const revOk = bury(reviews);
    const newOk = bury(news);

    // Límites por mazo
    const extra = V.extraNewToday();
    const left = {};
    const lim = (deckId) =>
      (left[deckId] =
        left[deckId] ||
        {
          n: Math.max(0, s.newPerDay + extra - ((counts.byDeck[deckId] || {}).newDone || 0)),
          r: Math.max(0, s.reviewsPerDay - ((counts.byDeck[deckId] || {}).revDone || 0)),
        });
    const revFinal = revOk.filter((it) => {
      const l = lim(it.note.deckId);
      if (l.r <= 0) return false;
      l.r--;
      return true;
    });
    const newFinal = newOk.filter((it) => {
      const l = lim(it.note.deckId);
      if (l.n <= 0) return false;
      l.n--;
      return true;
    });
    learn.sort((a, b) => a.card.due - b.card.due);
    return { learn, reviews: revFinal, news: newFinal, counts };
  };

  V.queueSummary = (deckIds) => {
    const q = V.queue(deckIds);
    return { newCount: q.news.length, learnCount: q.learn.length, dueCount: q.reviews.length, q };
  };

  // --------------------------------------------------------------- voz
  const synth = window.speechSynthesis;
  V.speech = {
    supported: !!(synth && window.SpeechSynthesisUtterance),
    voices() {
      if (!this.supported) return [];
      try {
        return synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang) || v.lang === 'en');
      } catch (e) {
        return [];
      }
    },
    pick() {
      const s = V.settings();
      const voices = this.voices();
      if (!voices.length) return null;
      const chosen = s.voiceURI && voices.find((v) => v.voiceURI === s.voiceURI);
      if (chosen) return chosen;
      const lang = s.accent.toLowerCase().replace('_', '-');
      const same = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === lang);
      const pool = same.length ? same : voices;
      const pref = /natural|neural|google|samantha|daniel|serena|aria|jenny|guy|libby|ryan/i;
      return pool.find((v) => pref.test(v.name)) || pool[0];
    },
    speak(text, rate) {
      if (!this.supported || !text) return false;
      try {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(String(text));
        const v = this.pick();
        if (v) u.voice = v;
        u.lang = (v && v.lang) || V.settings().accent;
        u.rate = rate || V.settings().ttsRate;
        synth.speak(u);
        return true;
      } catch (e) {
        return false;
      }
    },
    stop() {
      try {
        synth && synth.cancel();
      } catch (e) {
        /* nada */
      }
    },
  };
  if (V.speech.supported) {
    try {
      synth.getVoices();
      synth.addEventListener && synth.addEventListener('voiceschanged', () => synth.getVoices());
    } catch (e) {
      /* nada */
    }
  }

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  V.listen = {
    // Dentro de claude.ai el visor no concede el micrófono: solo fuera.
    supported: !!Recognition && !window.claude,
    /** Escucha una vez y devuelve las transcripciones candidatas. */
    once(lang) {
      return new Promise((resolve, reject) => {
        let rec;
        try {
          rec = new Recognition();
        } catch (e) {
          reject(e);
          return;
        }
        rec.lang = lang;
        rec.maxAlternatives = 5;
        rec.interimResults = false;
        let done = false;
        rec.onresult = (ev) => {
          done = true;
          const alts = [];
          const res = ev.results[0];
          for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
          resolve(alts);
        };
        rec.onerror = (ev) => {
          done = true;
          reject(ev.error || 'error');
        };
        rec.onend = () => {
          if (!done) resolve([]);
        };
        rec.start();
      });
    },
  };

  // ------------------------------------------------------------ imágenes
  V.compressImage = (file, maxSide) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('No se pudo leer la imagen'));
        img.onload = () => {
          let side = maxSide || 480;
          let quality = 0.78;
          for (let attempt = 0; attempt < 5; attempt++) {
            const scale = Math.min(1, side / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const url = canvas.toDataURL('image/jpeg', quality);
            if (url.length < 120000 || attempt === 4) {
              resolve(url);
              return;
            }
            side = Math.round(side * 0.75);
            quality -= 0.08;
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  // ------------------------------------------------- ventanas y avisos
  V.modal = ({ title, body, actions, onMount, wide }) =>
    new Promise((resolve) => {
      const root = V.$('#modal-root');
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML =
        '<div class="modal' +
        (wide ? ' modal-wide' : '') +
        '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<div class="modal-head"><h2 id="modal-title">' +
        V.esc(title || '') +
        '</h2><button class="icon-btn" data-close aria-label="Cerrar">' +
        V.icon('x') +
        '</button></div><div class="modal-body">' +
        (body || '') +
        '</div>' +
        (actions && actions.length
          ? '<div class="modal-actions">' +
            actions
              .map(
                (a, i) =>
                  '<button class="btn ' +
                  (a.kind ? 'btn-' + a.kind : 'btn-ghost') +
                  '" data-idx="' +
                  i +
                  '">' +
                  V.esc(a.label) +
                  '</button>'
              )
              .join('') +
            '</div>'
          : '') +
        '</div>';
      const prevFocus = document.activeElement;
      const close = (value) => {
        document.removeEventListener('keydown', onKey, true);
        wrap.remove();
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve(value);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close(undefined);
        }
      };
      document.addEventListener('keydown', onKey, true);
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap || e.target.closest('[data-close]')) close(undefined);
        const b = e.target.closest('[data-idx]');
        if (b) {
          const a = actions[+b.dataset.idx];
          const v = a.value !== undefined ? a.value : a.label;
          if (a.validate) {
            const ok = a.validate(wrap);
            if (!ok) return;
          }
          close(a.collect ? a.collect(wrap) : v);
        }
      });
      root.appendChild(wrap);
      const focusable = wrap.querySelector('input, select, textarea, .btn-primary, .btn-danger');
      if (focusable) focusable.focus();
      if (onMount) onMount(wrap, close);
    });

  V.confirm = (text, opts) =>
    V.modal({
      title: (opts && opts.title) || '¿Seguro?',
      body: '<p>' + text + '</p>',
      actions: [
        { label: 'Cancelar', kind: 'ghost', value: false },
        { label: (opts && opts.ok) || 'Confirmar', kind: opts && opts.danger ? 'danger' : 'primary', value: true },
      ],
    }).then((v) => v === true);

  V.prompt = (title, value, opts) =>
    V.modal({
      title,
      body:
        '<label class="field"><span>' +
        V.esc((opts && opts.label) || 'Nombre') +
        '</span><input id="prompt-input" type="text" maxlength="60" value="' +
        V.esc(value || '') +
        '" autocomplete="off"></label>',
      actions: [
        { label: 'Cancelar', kind: 'ghost', value: null },
        {
          label: (opts && opts.ok) || 'Guardar',
          kind: 'primary',
          collect: (w) => V.$('#prompt-input', w).value.trim() || null,
        },
      ],
      onMount: (w, close) => {
        const input = V.$('#prompt-input', w);
        input.select();
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            close(input.value.trim() || null);
          }
        });
      },
    });

  V.toast = (msg, opts) => {
    const root = V.$('#toast-root');
    const el = document.createElement('div');
    el.className = 'toast' + (opts && opts.tone ? ' toast-' + opts.tone : '');
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span>' +
      V.esc(msg) +
      '</span>' +
      (opts && opts.action ? '<button class="toast-action">' + V.esc(opts.action.label) + '</button>' : '');
    const remove = () => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 250);
    };
    if (opts && opts.action) {
      el.querySelector('.toast-action').addEventListener('click', () => {
        opts.action.fn();
        remove();
      });
    }
    root.appendChild(el);
    setTimeout(remove, (opts && opts.timeout) || 3200);
  };

  V.copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  };

  /** Ofrece un archivo para guardar (capacidad "downloads" en Claude o enlace normal fuera). */
  V.saveFile = async (filename, data, mime) => {
    if (window.claude && typeof window.claude.use === 'function') {
      const dl = await window.claude.use('downloads').catch(() => null);
      if (dl) {
        try {
          await dl.save({ filename, data });
          return 'saved';
        } catch (e) {
          if (e && e.code === 'declined') return 'declined';
          return 'failed';
        }
      }
      return 'failed';
    }
    try {
      const blob = new Blob([data], { type: mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1000);
      return 'saved';
    } catch (e) {
      return 'failed';
    }
  };

  // --------------------------------------------------------------- tema
  V.applyTheme = () => {
    const t = V.state.meta ? V.settings().theme : 'system';
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
    else if (V.state.themeSet) root.removeAttribute('data-theme');
    V.state.themeSet = t !== 'system';
  };

  // --------------------------------------------------------- navegación
  V.routes = {};
  V.go = (view, params) => {
    V.state.params = params || {};
    // El hashchange que provoca esto llega después y se ignora en main.js,
    // porque para entonces la vista ya está dibujada.
    if (location.hash.slice(1) !== view) location.hash = view;
    V.render();
  };

  V.render = () => {
    if (!V.state.ready) return;
    let view = location.hash.slice(1) || 'hoy';
    if (!V.routes[view]) view = 'hoy';
    if (view === 'estudiar' && !V.state.session) view = 'hoy';
    V.state.view = view;
    document.body.dataset.view = view;
    V.$$('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === view;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const main = V.$('#view');
    V.cleanup && V.cleanup();
    V.cleanup = null;
    V.routes[view](main);
    if (!V.state.keepScroll) window.scrollTo(0, 0);
    V.state.keepScroll = false;
  };

  V.setSync = (status) => {
    V.state.sync = status;
    const el = V.$('#sync');
    if (!el) return;
    const kind = V.state.backend ? V.state.backend.kind : 'local';
    const where = kind === 'cloud' ? 'en tu cuenta' : kind === 'memory' ? 'solo en esta sesión' : 'en este navegador';
    let text;
    if (status === 'saving') text = 'Guardando…';
    else if (status === 'error') text = 'No se pudo guardar';
    else text = 'Guardado ' + where;
    el.dataset.state = status;
    el.title = text;
    el.innerHTML = V.icon(kind === 'cloud' ? 'cloud' : 'device', 16) + '<span>' + V.esc(text) + '</span>';
  };
})();
