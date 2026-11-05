/* Vocablo · ajustes, importar y exportar */
(function () {
  'use strict';
  const V = window.V;

  // ------------------------------------------------------------- pasos
  const parseSteps = (txt) => {
    const out = [];
    for (const tok of String(txt).trim().split(/[\s,]+/).filter(Boolean)) {
      const m = /^(\d+(?:[.,]\d+)?)\s*([smhd]?)$/i.exec(tok);
      if (!m) return null;
      const n = parseFloat(m[1].replace(',', '.'));
      const unit = (m[2] || 'm').toLowerCase();
      const min = unit === 's' ? n / 60 : unit === 'h' ? n * 60 : unit === 'd' ? n * 1440 : n;
      if (!(min > 0)) return null;
      out.push(Math.round(min * 100) / 100);
    }
    return out;
  };
  const fmtSteps = (arr) =>
    (arr || [])
      .map((m) => (m >= 1440 && m % 1440 === 0 ? m / 1440 + 'd' : m >= 60 && m % 60 === 0 ? m / 60 + 'h' : m + 'm'))
      .join(' ');

  function field(label, control, hint) {
    return '<label class="set-row"><span class="set-label">' + label + (hint ? '<small>' + hint + '</small>' : '') + '</span>' + control + '</label>';
  }
  function num(key, min, max, step) {
    return '<input type="number" class="set-num" id="s-' + key + '" data-s="' + key + '" data-type="num" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + V.esc(V.settings()[key]) + '" inputmode="decimal">';
  }
  function pct(key, min, max) {
    return '<span class="with-unit"><input type="number" class="set-num" id="s-' + key + '" data-s="' + key + '" data-type="pct" min="' + min + '" max="' + max + '" step="1" value="' + Math.round(V.settings()[key] * 100) + '" inputmode="numeric"><span>%</span></span>';
  }
  function toggle(key) {
    return '<span class="switch"><input type="checkbox" role="switch" id="s-' + key + '" data-s="' + key + '" data-type="bool"' + (V.settings()[key] ? ' checked' : '') + '><span class="switch-ui" aria-hidden="true"></span></span>';
  }
  function select(key, options) {
    const cur = String(V.settings()[key]);
    return (
      '<select id="s-' + key + '" data-s="' + key + '" data-type="' + (typeof V.settings()[key] === 'number' ? 'num' : 'str') + '">' +
      options.map(([v, l]) => '<option value="' + V.esc(v) + '"' + (String(v) === cur ? ' selected' : '') + '>' + V.esc(l) + '</option>').join('') +
      '</select>'
    );
  }

  function voiceOptions() {
    const st = V.settings();
    const voices = V.speech.voices();
    const lang = st.accent.toLowerCase();
    const sorted = voices.slice().sort((a, b) => {
      const am = a.lang.toLowerCase().replace('_', '-') === lang ? 0 : 1;
      const bm = b.lang.toLowerCase().replace('_', '-') === lang ? 0 : 1;
      return am - bm || a.name.localeCompare(b.name);
    });
    return (
      '<option value="">Automática (la mejor para el acento)</option>' +
      sorted.map((v) => '<option value="' + V.esc(v.voiceURI) + '"' + (v.voiceURI === st.voiceURI ? ' selected' : '') + '>' + V.esc(v.name + ' · ' + v.lang) + '</option>').join('')
    );
  }

  V.routes.ajustes = (main) => {
    const st = V.settings();
    const fsrs = st.algorithm === 'fsrs';
    const backend = V.state.backend;
    const cloud = backend && backend.kind === 'cloud';
    const words = V.state.notes.size;

    main.innerHTML =
      '<section class="page settings">' +
      '<header class="page-head"><div><p class="eyebrow">Ajustes</p><h1>Cómo estudias</h1></div></header>' +
      // estudio diario
      '<section class="panel"><h2>Estudio diario</h2>' +
      field('Palabras nuevas al día', num('newPerDay', 0, 999), 'Por mazo, como en Anki. 10-20 es un ritmo sostenible.') +
      field('Máximo de repasos al día', num('reviewsPerDay', 0, 9999), 'Por mazo. Si lo bajas mucho se acumulan repasos.') +
      field('Meta diaria', num('dailyGoal', 1, 2000), 'Fichas respondidas para completar el anillo de «Hoy».') +
      field('Orden de nuevas y repasos', select('newMix', [['mix', 'Mezcladas'], ['before', 'Nuevas primero'], ['after', 'Nuevas al final']])) +
      field('Orden de las nuevas', select('newOrder', [['added', 'Como las añadiste'], ['random', 'Al azar']])) +
      field('Una ficha por palabra al día', toggle('buryNotes'), 'Entierra hasta mañana las fichas hermanas (EN→ES y ES→EN) para que una no te chive la otra.') +
      field('El día empieza a las', select('dayStartHour', Array.from({ length: 24 }, (_, h) => [h, String(h).padStart(2, '0') + ':00'])), 'Si estudias de madrugada, lo de las 2:00 cuenta para el día anterior.') +
      '</section>' +
      // algoritmo
      '<section class="panel"><h2>Algoritmo de memorización</h2>' +
      '<div class="algo-choice" role="radiogroup" aria-label="Algoritmo">' +
      '<label class="algo-opt"><input type="radio" name="algo" value="sm2"' +
      (fsrs ? '' : ' checked') +
      '><span><strong>SM-2 · el clásico de Anki</strong><small>Cada ficha tiene una «facilidad» (250 % al empezar). Acertar multiplica el intervalo por ella; fallar la baja un 20 %. Es el sistema por defecto de Anki.</small></span></label>' +
      '<label class="algo-opt"><input type="radio" name="algo" value="fsrs"' +
      (fsrs ? ' checked' : '') +
      '><span><strong>FSRS-5 · el moderno</strong><small>Modela la estabilidad y la dificultad de tu memoria para cada ficha y programa el repaso cuando la probabilidad de recordar cae a tu retención deseada. Según sus autores, suele pedir un 20-30 % menos de repasos para la misma retención.</small></span></label>' +
      '</div>' +
      (fsrs
        ? field(
            'Retención deseada',
            '<span class="range-wrap"><input type="range" id="s-desiredRetention" data-s="desiredRetention" data-type="float" min="0.8" max="0.97" step="0.01" value="' +
              st.desiredRetention +
              '"><output id="ret-out">' +
              Math.round(st.desiredRetention * 100) +
              ' %</output></span>',
            'Más alta = recuerdas más, pero repasas bastante más. 90 % es el punto dulce.'
          )
        : '') +
      '<details class="advanced"><summary>Opciones avanzadas (las mismas de Anki)</summary>' +
      field('Pasos de aprendizaje', '<input type="text" class="set-text" id="s-learningSteps" data-s="learningSteps" data-type="steps" value="' + fmtSteps(st.learningSteps) + '" spellcheck="false">', 'Separados por espacios: 1m 10m, 1h, 1d…') +
      field('Pasos de reaprendizaje', '<input type="text" class="set-text" id="s-relearningSteps" data-s="relearningSteps" data-type="steps" value="' + fmtSteps(st.relearningSteps) + '" spellcheck="false">') +
      (fsrs
        ? ''
        : field('Intervalo de graduación', '<span class="with-unit">' + num('graduatingInterval', 1, 365) + '<span>días</span></span>') +
          field('Intervalo fácil', '<span class="with-unit">' + num('easyInterval', 1, 365) + '<span>días</span></span>') +
          field('Facilidad inicial', pct('startingEase', 131, 500)) +
          field('Bonus fácil', pct('easyBonus', 100, 500)) +
          field('Intervalo difícil', pct('hardInterval', 50, 200)) +
          field('Nuevo intervalo tras fallo', pct('newInterval', 0, 100), '0 % = vuelve a 1 día, como en Anki.')) +
      field('Modificador de intervalo', pct('intervalModifier', 50, 300)) +
      field('Intervalo máximo', '<span class="with-unit">' + num('maximumInterval', 1, 36500) + '<span>días</span></span>') +
      field('Umbral de palabra difícil', num('leechThreshold', 0, 99), 'Fallos tras los que una ficha se marca como «sanguijuela» (leech). 0 = nunca.') +
      field('Al llegar al umbral', select('leechAction', [['tag', 'Solo marcarla'], ['suspend', 'Marcarla y suspenderla']])) +
      field('Variar un poco los intervalos', toggle('fuzz'), 'El «fuzz» de Anki: evita que las fichas del mismo día venzan siempre juntas.') +
      '<div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="reset-algo">Restablecer valores de Anki</button></div>' +
      '</details>' +
      '</section>' +
      // fichas
      '<section class="panel"><h2>Fichas nuevas</h2><p class="muted small">Qué fichas se crean por defecto al añadir una palabra (puedes cambiarlo en cada una).</p>' +
      '<div class="kind-grid">' +
      V.KIND_ORDER.map(
        (k) =>
          '<label class="kind-opt"><input type="checkbox" data-kind="' + k + '"' + (st.cardKinds[k] ? ' checked' : '') + '><span><strong>' + V.esc(V.KINDS[k].label) + '</strong><small>' + V.esc(V.KINDS[k].desc) + '</small></span></label>'
      ).join('') +
      '</div>' +
      field('Escribir la respuesta en «Español → Inglés»', toggle('typeAnswer'), 'Te obliga a deletrear la palabra y la compara letra a letra. En «Escucha» y «Completar» siempre puedes escribirla.') +
      '</section>' +
      // voz
      '<section class="panel"><h2>Pronunciación</h2>' +
      (V.speech.supported
        ? field('Acento', select('accent', [['en-US', 'Estadounidense'], ['en-GB', 'Británico'], ['en-AU', 'Australiano'], ['en-CA', 'Canadiense'], ['en-IE', 'Irlandés'], ['en-IN', 'Indio']])) +
          field('Voz', '<select id="s-voiceURI" data-s="voiceURI" data-type="str">' + voiceOptions() + '</select>', 'Las voces dependen de tu dispositivo. En móvil suelen ser mejores las «mejoradas» o «naturales».') +
          field(
            'Velocidad',
            '<span class="range-wrap"><input type="range" id="s-ttsRate" data-s="ttsRate" data-type="float" min="0.5" max="1.3" step="0.05" value="' + st.ttsRate + '"><output id="rate-out">' + st.ttsRate.toFixed(2).replace('.', ',') + '×</output></span>'
          ) +
          field('Leer la palabra automáticamente', toggle('autoPlay')) +
          '<div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="test-voice">' + V.icon('speaker', 16) + 'Probar: «The pharmacist checked the prescription»</button></div>'
        : '<p class="muted">Este navegador no tiene voz sintética. Las fichas funcionan igual, pero sin audio.</p>') +
      (V.listen.supported ? '' : '<p class="muted small">La práctica de pronunciación con micrófono solo está disponible en navegadores con reconocimiento de voz (Chrome, Edge, Safari) y fuera de claude.ai.</p>') +
      '</section>' +
      // apariencia
      '<section class="panel"><h2>Apariencia</h2>' +
      field('Tema', select('theme', [['system', 'Como el sistema'], ['light', 'Claro'], ['dark', 'Oscuro']])) +
      '</section>' +
      // datos
      '<section class="panel"><h2>Tus datos</h2>' +
      '<p class="storage-line">' +
      V.icon(cloud ? 'cloud' : 'device', 18) +
      '<span>' +
      (cloud
        ? '<strong>Guardado en tu cuenta de Claude.</strong> Tus fichas son privadas y te siguen a cualquier dispositivo donde abras esta página con tu sesión iniciada.'
        : backend && backend.kind === 'memory'
          ? '<strong>Solo en esta sesión.</strong> Este navegador no permite guardar datos: exporta una copia antes de cerrar.'
          : '<strong>Guardado en este navegador.</strong> Si borras los datos del sitio se pierden: exporta una copia de vez en cuando.') +
      '</span></p>' +
      '<div class="data-actions">' +
      '<button class="btn btn-ghost" data-act="export-json">' + V.icon('download', 16) + 'Copia de seguridad (.json)</button>' +
      '<button class="btn btn-ghost" data-act="export-anki">' + V.icon('download', 16) + 'Exportar para Anki (.txt)</button>' +
      '<button class="btn btn-ghost" data-act="import-file">' + V.icon('upload', 16) + 'Importar archivo</button>' +
      '<button class="btn btn-ghost" data-act="import-paste">' + V.icon('copy', 16) + 'Pegar una lista</button>' +
      '<input type="file" id="import-input" accept=".json,.csv,.tsv,.txt,text/plain,application/json,text/csv" hidden>' +
      '</div>' +
      '<p class="muted small">Importa copias de Vocablo o listas CSV/TSV (palabra, traducción, ejemplo…), incluida la exportación «Notas en texto plano» de Anki. Para llevar tus fichas a Anki: Archivo → Importar y elige el tipo de nota «Básico (y tarjeta invertida)».</p>' +
      '<div class="data-actions">' +
      '<button class="btn btn-ghost" data-act="sample">Añadir mazo de ejemplo</button>' +
      '<button class="btn btn-ghost btn-danger-text" data-act="wipe"' + (words || V.state.logs.size ? '' : ' disabled') + '>' + V.icon('trash', 16) + 'Borrar todo</button>' +
      '</div>' +
      '</section>' +
      // atajos
      '<section class="panel"><h2>Atajos de teclado</h2>' +
      '<dl class="shortcuts">' +
      [
        ['Espacio', 'Mostrar respuesta · luego «Bien»'],
        ['1 2 3 4', 'Otra vez · Difícil · Bien · Fácil'],
        ['Intro', 'Comprobar lo que escribiste'],
        ['R', 'Repetir el audio'],
        ['H', 'Pista (una letra más cada vez)'],
        ['E', 'Editar la palabra'],
        ['U o Ctrl+Z', 'Deshacer la última respuesta'],
        ['Esc', 'Terminar la sesión'],
        ['Ctrl+Intro', 'Guardar en el editor'],
      ]
        .map(([k, d]) => '<div><dt><kbd>' + k + '</kbd></dt><dd>' + d + '</dd></div>')
        .join('') +
      '</dl></section>' +
      '<p class="muted small about">Vocablo usa el planificador SM-2 de Anki (como su planificador v3) y FSRS-5 con sus pesos por defecto. No es un producto de Anki ni está afiliado a él.</p>' +
      '</section>';

    const section = main.firstElementChild;

    section.addEventListener('change', (e) => {
      const el = e.target;
      if (el.name === 'algo') {
        st.algorithm = el.value;
        V.saveMeta();
        V.toast(el.value === 'fsrs' ? 'FSRS activado: se aplica desde tu próximo repaso de cada ficha' : 'SM-2 activado');
        V.state.keepScroll = true;
        V.render();
        return;
      }
      if (el.dataset.kind) {
        st.cardKinds[el.dataset.kind] = el.checked;
        if (!Object.values(st.cardKinds).some(Boolean)) {
          st.cardKinds.recognition = true;
          V.toast('Al menos un tipo de ficha debe estar activo.');
          V.state.keepScroll = true;
          V.render();
        }
        V.saveMeta();
        return;
      }
      const key = el.dataset.s;
      if (!key) return;
      const type = el.dataset.type;
      let v;
      if (type === 'bool') v = el.checked;
      else if (type === 'steps') {
        v = parseSteps(el.value);
        if (!v || (key === 'learningSteps' && !v.length && false)) {
          V.toast('Escribe los pasos como «1m 10m» o «10m 1h».', { tone: 'bad' });
          el.value = fmtSteps(st[key]);
          return;
        }
        el.value = fmtSteps(v);
      } else if (type === 'pct') v = parseFloat(el.value) / 100;
      else if (type === 'num' || type === 'float') v = parseFloat(el.value);
      else v = el.value;
      if ((type === 'num' || type === 'pct' || type === 'float') && !Number.isFinite(v)) {
        el.value = type === 'pct' ? Math.round(st[key] * 100) : st[key];
        return;
      }
      if (type === 'num' || type === 'pct') {
        const min = parseFloat(el.min);
        const max = parseFloat(el.max);
        const raw = type === 'pct' ? v * 100 : v;
        const c = V.clamp(raw, min, max);
        if (c !== raw) el.value = c;
        v = type === 'pct' ? c / 100 : c;
      }
      st[key] = v;
      if (key === 'accent') {
        st.voiceURI = '';
        const vs = V.$('#s-voiceURI');
        if (vs) vs.innerHTML = voiceOptions();
      }
      V.saveMeta();
      if (key === 'theme') V.applyTheme();
      if (key === 'voiceURI' || key === 'accent') V.speech.speak('Hello! This is how I sound.');
    });
    section.addEventListener('input', (e) => {
      if (e.target.id === 's-desiredRetention') V.$('#ret-out').textContent = Math.round(e.target.value * 100) + ' %';
      if (e.target.id === 's-ttsRate') V.$('#rate-out').textContent = Number(e.target.value).toFixed(2).replace('.', ',') + '×';
    });
    if (V.speech.supported && window.speechSynthesis.addEventListener) {
      const refresh = () => {
        const vs = V.$('#s-voiceURI');
        if (vs) vs.innerHTML = voiceOptions();
      };
      window.speechSynthesis.addEventListener('voiceschanged', refresh);
      V.cleanup = () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
    }

    section.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'reset-algo') {
        for (const k of ['learningSteps', 'relearningSteps', 'graduatingInterval', 'easyInterval', 'startingEase', 'easyBonus', 'hardInterval', 'intervalModifier', 'newInterval', 'maximumInterval', 'leechThreshold', 'leechAction', 'fuzz', 'desiredRetention']) {
          st[k] = V.clone(V.DEFAULT_SETTINGS[k]);
        }
        V.saveMeta();
        V.toast('Valores de Anki restablecidos');
        V.state.keepScroll = true;
        V.render();
      } else if (act === 'test-voice') {
        V.speech.speak('The pharmacist checked the prescription.');
      } else if (act === 'export-json') exportJson();
      else if (act === 'export-anki') exportAnki();
      else if (act === 'import-file') V.$('#import-input').click();
      else if (act === 'import-paste') pasteImport();
      else if (act === 'sample') {
        const n = V.loadSampleDeck();
        V.toast(n ? 'Añadidas ' + n + ' palabras de ejemplo' : 'Ya tenías todas las palabras de ejemplo');
      } else if (act === 'wipe') wipe();
    });
    V.$('#import-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        if (/\.json$/i.test(file.name) || text.trim().startsWith('{')) await importJson(text);
        else await importText(text);
      } catch (err) {
        V.toast('No pude leer ese archivo: ' + (err.message || err), { tone: 'bad', timeout: 6000 });
      }
    });
  };

  // ------------------------------------------------------------- exportar
  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  async function offer(filename, data, mime) {
    const res = await V.saveFile(filename, data, mime);
    if (res === 'saved') V.toast('Archivo listo: ' + filename);
    else if (res === 'declined') V.toast('Descarga cancelada');
    else {
      const copied = await V.copyText(data);
      V.toast(copied ? 'No se pudo descargar aquí; copié el contenido al portapapeles.' : 'No se pudo descargar ni copiar el archivo.', { timeout: 6000 });
    }
  }

  function exportJson() {
    const data = {
      app: 'vocablo',
      version: 1,
      exportedAt: new Date().toISOString(),
      meta: V.state.meta,
      notes: Array.from(V.state.notes.values()),
      logs: Array.from(V.state.logs.values()),
    };
    offer('vocablo-copia-' + stamp() + '.json', JSON.stringify(data, null, 1), 'application/json');
  }

  function exportAnki() {
    const clean = (s) => V.esc(String(s || '')).replace(/[\t\r\n]+/g, ' ');
    const lines = ['#separator:tab', '#html:true', '#tags column:3'];
    for (const n of V.state.notes.values()) {
      const deck = V.deck(n.deckId);
      const front = clean(n.word) + (n.ipa ? '<br><small>' + clean(n.ipa) + '</small>' : '');
      const back = [
        '<b>' + clean(n.translation) + '</b>',
        n.definition ? '<i>' + clean(n.definition) + '</i>' : '',
        n.example ? clean(n.example) + (n.exampleTr ? '<br><small>' + clean(n.exampleTr) + '</small>' : '') : '',
        n.mnemonic ? '💡 ' + clean(n.mnemonic) : '',
      ]
        .filter(Boolean)
        .join('<br><br>');
      const tags = [deck ? 'vocablo::' + deck.name : 'vocablo']
        .concat(n.tags || [])
        .map((t) => String(t).replace(/\s+/g, '_'))
        .join(' ');
      lines.push(front + '\t' + back + '\t' + tags);
    }
    offer('vocablo-para-anki-' + stamp() + '.txt', lines.join('\n') + '\n', 'text/plain');
  }

  // ------------------------------------------------------------- importar
  async function importJson(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('el JSON no es válido');
    }
    if (!data || !Array.isArray(data.notes) || !data.meta) throw new Error('no parece una copia de Vocablo');
    const mode = await V.modal({
      title: 'Importar copia de seguridad',
      body:
        '<p>La copia tiene <strong>' +
        data.notes.length +
        ' ' +
        V.plural(data.notes.length, 'palabra', 'palabras') +
        '</strong> y ' +
        (data.logs || []).length +
        ' días de historial.</p><p class="muted small">«Combinar» añade lo que falta y conserva la versión más reciente de cada palabra. «Reemplazar» borra lo que tienes ahora.</p>',
      actions: [
        { label: 'Cancelar', kind: 'ghost', value: null },
        { label: 'Reemplazar todo', kind: 'danger', value: 'replace' },
        { label: 'Combinar', kind: 'primary', value: 'merge' },
      ],
    });
    if (!mode) return;
    if (mode === 'replace') await wipeAll();
    const meta = V.state.meta;
    if (mode === 'replace') {
      V.state.meta = V.normalizeMeta(data.meta);
    } else {
      for (const d of data.meta.decks || []) if (!meta.decks.some((x) => x.id === d.id)) meta.decks.push(d);
    }
    V.saveMeta();
    let n = 0;
    for (const note of data.notes) {
      if (!note || !note.id || !note.word || !note.cards) continue;
      const cur = V.state.notes.get(note.id);
      if (!cur || (note.updatedAt || 0) > (cur.updatedAt || 0)) {
        if (!V.deck(note.deckId)) note.deckId = V.state.meta.decks[0].id;
        V.saveNote(note, false);
        n++;
      }
    }
    for (const day of data.logs || []) {
      if (!day || !day.day || !Array.isArray(day.entries)) continue;
      const cur = V.state.logs.get(day.day);
      if (!cur) {
        V.state.logs.set(day.day, day);
        V.saveLogDay(day);
      } else {
        const ids = new Set(cur.entries.map((e) => e.id));
        const add = day.entries.filter((e) => !ids.has(e.id));
        if (add.length) {
          cur.entries = cur.entries.concat(add).sort((a, b) => a.id - b.id);
          V.saveLogDay(cur);
        }
      }
    }
    V.applyTheme();
    V.toast('Importadas ' + n + ' ' + V.plural(n, 'palabra', 'palabras'));
    V.render();
  }

  function parseDelimited(text) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/);
    let sep = null;
    let htmlMode = false;
    const body = [];
    for (const l of lines) {
      const m = /^#separator:(.+)$/i.exec(l.trim());
      if (m) {
        const s = m[1].trim().toLowerCase();
        sep = s === 'tab' ? '\t' : s === 'semicolon' ? ';' : s === 'comma' ? ',' : s === 'pipe' ? '|' : s === 'space' ? ' ' : s;
        continue;
      }
      if (/^#html:true/i.test(l.trim())) {
        htmlMode = true;
        continue;
      }
      if (/^#/.test(l)) continue;
      body.push(l);
    }
    const src = body.join('\n');
    if (!sep) {
      const first = body.find((l) => l.trim()) || '';
      sep = first.includes('\t') ? '\t' : first.includes(';') ? ';' : ',';
    }
    const rows = [];
    let row = [];
    let fieldv = '';
    let q = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (q) {
        if (c === '"' && src[i + 1] === '"') {
          fieldv += '"';
          i++;
        } else if (c === '"') q = false;
        else fieldv += c;
      } else if (c === '"' && fieldv === '') q = true;
      else if (c === sep) {
        row.push(fieldv);
        fieldv = '';
      } else if (c === '\n') {
        row.push(fieldv);
        rows.push(row);
        row = [];
        fieldv = '';
      } else fieldv += c;
    }
    row.push(fieldv);
    rows.push(row);
    return { rows: rows.filter((r) => r.some((x) => x.trim())), htmlMode };
  }

  function stripHtml(s) {
    const withBreaks = String(s || '')
      .replace(/\[sound:[^\]]*\]/g, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(div|p|li)>/gi, '\n');
    const doc = new DOMParser().parseFromString('<body>' + withBreaks + '</body>', 'text/html');
    return (doc.body.textContent || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();
  }

  async function importText(text) {
    const { rows } = parseDelimited(text);
    if (!rows.length) throw new Error('no encontré filas');
    let start = 0;
    if (/^(word|palabra|front|anverso|english|inglés|ingles)$/i.test((rows[0][0] || '').trim())) start = 1;
    const items = rows.slice(start).map((r) => {
      const word = stripHtml(r[0]).split('\n')[0].trim();
      const backLines = stripHtml(r[1] || '')
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean);
      return {
        word,
        translation: backLines[0] || '',
        notes: backLines.slice(1).join(' · '),
        example: stripHtml(r[2] || ''),
        exampleTr: stripHtml(r[3] || ''),
        definition: stripHtml(r[4] || ''),
        ipa: stripHtml(r[5] || ''),
      };
    });
    const valid = items.filter((x) => x.word && x.translation);
    const dups = valid.filter((x) => V.findDuplicate(x.word)).length;
    if (!valid.length) throw new Error('las filas necesitan al menos palabra y traducción');
    const deckSel =
      '<label class="field"><span>Mazo de destino</span><select id="imp-deck">' +
      V.state.meta.decks.map((d) => '<option value="' + V.esc(d.id) + '">' + V.esc(d.name) + '</option>').join('') +
      '<option value="__new">Nuevo mazo «Importadas»</option></select></label>';
    const deckId = await V.modal({
      title: 'Importar lista',
      body:
        '<p>Encontré <strong>' +
        valid.length +
        ' ' +
        V.plural(valid.length, 'palabra', 'palabras') +
        '</strong>' +
        (dups ? ' (' + dups + ' ya ' + V.plural(dups, 'existe y se omitirá', 'existen y se omitirán') + ')' : '') +
        '.</p><p class="muted small">Columnas: palabra, traducción, ejemplo, traducción del ejemplo, definición, IPA. Solo las dos primeras son obligatorias.</p>' +
        deckSel,
      actions: [
        { label: 'Cancelar', kind: 'ghost', value: null },
        { label: 'Importar', kind: 'primary', collect: (w) => V.$('#imp-deck', w).value },
      ],
    });
    if (!deckId) return;
    const target = deckId === '__new' ? V.createDeck('Importadas').id : deckId;
    const base = Date.now();
    let n = 0;
    valid.forEach((x, i) => {
      if (V.findDuplicate(x.word)) return;
      const note = V.createNote(x, target, V.settings().cardKinds);
      note.createdAt = base + i;
      V.saveNote(note);
      n++;
    });
    V.toast('Importadas ' + n + ' ' + V.plural(n, 'palabra', 'palabras'));
  }

  async function pasteImport() {
    const text = await V.modal({
      title: 'Pegar una lista',
      body:
        '<label class="field"><span>Una palabra por línea: palabra, tabulador o punto y coma, traducción (y si quieres, ejemplo).</span><textarea id="paste-box" rows="9" spellcheck="false" placeholder="thorough;minucioso;We need a thorough review.\nshortage;escasez"></textarea></label>',
      actions: [
        { label: 'Cancelar', kind: 'ghost', value: null },
        { label: 'Continuar', kind: 'primary', collect: (w) => V.$('#paste-box', w).value },
      ],
    });
    if (!text || !text.trim()) return;
    try {
      if (text.trim().startsWith('{')) await importJson(text);
      else await importText(text);
    } catch (err) {
      V.toast('No pude importar: ' + (err.message || err), { tone: 'bad', timeout: 6000 });
    }
  }

  async function wipeAll() {
    for (const id of Array.from(V.state.notes.keys())) V.removeNote(id);
    for (const key of Array.from(V.state.logs.keys())) {
      V.state.logs.delete(key);
      V.state.backend && V.state.backend.deleteLog(key);
    }
    V.state.meta = V.freshMeta();
    V.saveMeta();
    V.state.session = null;
  }

  async function wipe() {
    const ok = await V.confirm(
      'Se borrarán tus ' + V.state.notes.size + ' palabras, su progreso y tu historial. No se puede deshacer. Si quieres conservarlas, exporta antes una copia.',
      { ok: 'Borrar todo', danger: true, title: 'Borrar todo' }
    );
    if (!ok) return;
    await wipeAll();
    V.applyTheme();
    V.toast('Todo borrado');
    V.go('hoy');
  }

  V.parseSteps = parseSteps;
  V.parseDelimited = parseDelimited;
})();
