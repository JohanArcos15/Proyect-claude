/* Vocablo · crear y editar palabras */
(function () {
  'use strict';
  const V = window.V;
  const FIELDS = ['word', 'translation', 'pos', 'ipa', 'level', 'definition', 'example', 'exampleTr', 'synonyms', 'mnemonic', 'notes'];

  V.findDuplicate = (word, exceptId) => {
    const w = V.norm(word);
    if (!w) return null;
    for (const n of V.state.notes.values()) {
      if (n.id !== exceptId && V.norm(n.word) === w) return n;
    }
    return null;
  };

  function deckOptions(selected) {
    return (
      V.state.meta.decks
        .map((d) => '<option value="' + V.esc(d.id) + '"' + (d.id === selected ? ' selected' : '') + '>' + V.esc(d.name) + '</option>')
        .join('') + '<option value="__new">+ Nuevo mazo…</option>'
    );
  }

  async function handleDeckSelect(sel, fallback) {
    if (sel.value !== '__new') return;
    const name = await V.prompt('Nuevo mazo', '', { label: 'Nombre del mazo', ok: 'Crear' });
    if (!name) {
      sel.value = fallback();
      return;
    }
    const deck = V.createDeck(name);
    sel.innerHTML = deckOptions(deck.id);
  }

  V.createDeck = (name) => {
    const meta = V.state.meta;
    const deck = { id: 'd' + V.uid(), name, color: meta.decks.length % V.DECK_COLORS.length, createdAt: Date.now() };
    meta.decks.push(deck);
    V.saveMeta();
    return deck;
  };

  V.routes.anadir = (main) => {
    const p = V.state.params || {};
    const editing = p.noteId ? V.state.notes.get(p.noteId) : null;
    const tab = editing ? 'one' : p.tab || V.state.editorTab || 'one';
    V.state.editorTab = tab;
    const st = V.settings();
    const lastDeck = V.state.lastDeck && V.deck(V.state.lastDeck) ? V.state.lastDeck : V.state.meta.decks[0].id;
    const deckId = editing ? editing.deckId : p.deckId || lastDeck;

    main.innerHTML =
      '<section class="page editor">' +
      '<header class="page-head">' +
      '<div><p class="eyebrow">' +
      (editing ? 'Editar' : 'Añadir') +
      '</p><h1>' +
      (editing ? V.esc(editing.word) : 'Nueva palabra') +
      '</h1></div>' +
      (editing
        ? ''
        : '<div class="seg" role="tablist"><button role="tab" data-tab="one" aria-selected="' +
          (tab === 'one') +
          '">Una palabra</button><button role="tab" data-tab="bulk" aria-selected="' +
          (tab === 'bulk') +
          '">Varias a la vez</button></div>') +
      '</header>' +
      '<div id="editor-body"></div>' +
      '</section>';

    const body = V.$('#editor-body');
    main.firstElementChild.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]');
      if (t && !editing) {
        V.state.editorTab = t.dataset.tab;
        V.state.params = {};
        V.render();
      }
    });
    if (tab === 'bulk' && !editing) renderBulk(body, deckId);
    else renderOne(body, editing, deckId, p);
  };

  // --------------------------------------------------------- una palabra
  function renderOne(body, editing, deckId, p) {
    const st = V.settings();
    const kinds = editing
      ? Object.fromEntries(V.KIND_ORDER.map((k) => [k, !!editing.cards[k]]))
      : Object.assign({}, st.cardKinds);
    const n = editing || {};
    let image = n.image || '';
    const val = (k) => V.esc(n[k] || '');
    const posOpts = ['', ...Object.keys(V.POS)]
      .map((k) => '<option value="' + k + '"' + ((n.pos || '') === k ? ' selected' : '') + '>' + (k ? V.esc(V.POS_ES[k]) : '—') + '</option>')
      .join('');
    const levelOpts = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
      .map((l) => '<option' + ((n.level || '') === l ? ' selected' : '') + ' value="' + l + '">' + (l || '—') + '</option>')
      .join('');

    body.innerHTML =
      '<form id="note-form" class="editor-grid" novalidate>' +
      '<div class="editor-main">' +
      '<div class="word-entry">' +
      '<label class="field grow"><span>Palabra o expresión en inglés</span><input id="f-word" class="input-word" type="text" value="' +
      val('word') +
      '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="p. ej. thorough" required></label>' +
      '<button type="button" class="btn btn-ai" id="ai-fill" hidden>' +
      V.icon('sparkle', 18) +
      '<span>Autocompletar</span></button>' +
      '</div>' +
      '<p class="field-hint" id="ai-status" aria-live="polite"></p>' +
      '<p class="dup-warning" id="dup" hidden></p>' +
      '<label class="field"><span>Traducción al español</span><input id="f-translation" type="text" value="' +
      val('translation') +
      '" autocomplete="off" placeholder="p. ej. minucioso, exhaustivo" required></label>' +
      '<div class="field-row">' +
      '<label class="field"><span>Categoría</span><select id="f-pos">' +
      posOpts +
      '</select></label>' +
      '<label class="field grow"><span>Pronunciación (IPA)</span><input id="f-ipa" class="ipa-input" type="text" value="' +
      val('ipa') +
      '" autocomplete="off" spellcheck="false" placeholder="/ˈθɝːoʊ/"></label>' +
      '<label class="field field-narrow"><span>Nivel</span><select id="f-level">' +
      levelOpts +
      '</select></label>' +
      '</div>' +
      '<label class="field"><span>Definición en inglés</span><textarea id="f-definition" rows="2" placeholder="Done carefully and completely.">' +
      val('definition') +
      '</textarea></label>' +
      '<label class="field"><span>Ejemplo en inglés</span><textarea id="f-example" rows="2" placeholder="We need a thorough review of the data.">' +
      val('example') +
      '</textarea></label>' +
      '<label class="field"><span>Traducción del ejemplo</span><textarea id="f-exampleTr" rows="2">' +
      val('exampleTr') +
      '</textarea></label>' +
      '<label class="field"><span>Sinónimos</span><input id="f-synonyms" type="text" value="' +
      val('synonyms') +
      '" autocomplete="off"></label>' +
      '<label class="field"><span>Mnemotecnia: un truco para recordarla</span><textarea id="f-mnemonic" rows="2">' +
      val('mnemonic') +
      '</textarea></label>' +
      '<label class="field"><span>Notas personales</span><textarea id="f-notes" rows="2">' +
      val('notes') +
      '</textarea></label>' +
      '</div>' +
      '<aside class="editor-side">' +
      '<label class="field"><span>Mazo</span><select id="f-deck">' +
      deckOptions(deckId) +
      '</select></label>' +
      '<fieldset class="field kinds"><legend>Fichas que se crean</legend>' +
      V.KIND_ORDER.map(
        (k) =>
          '<label class="kind-opt"><input type="checkbox" name="kind" value="' +
          k +
          '"' +
          (kinds[k] ? ' checked' : '') +
          '><span><strong>' +
          V.esc(V.KINDS[k].label) +
          '</strong><small>' +
          V.esc(V.KINDS[k].desc) +
          '</small>' +
          (k === 'cloze' ? '<small class="cloze-warn" hidden>Necesita un ejemplo que contenga la palabra.</small>' : '') +
          '</span></label>'
      ).join('') +
      '</fieldset>' +
      '<div class="field"><span class="label">Imagen (opcional)</span>' +
      '<div class="image-drop" id="image-drop" tabindex="0" role="button" aria-label="Añadir imagen">' +
      '<div class="image-preview" id="image-preview"></div>' +
      '<div class="image-empty">' +
      V.icon('image', 22) +
      '<span>Elige, arrastra o pega una imagen</span></div>' +
      '</div>' +
      '<input id="f-image" type="file" accept="image/*" hidden>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="image-remove" hidden>Quitar imagen</button>' +
      '</div>' +
      '<label class="field"><span>Etiquetas</span><input id="f-tags" type="text" value="' +
      V.esc((n.tags || []).join(', ')) +
      '" placeholder="separadas por comas" autocomplete="off"></label>' +
      '</aside>' +
      '<div class="editor-actions">' +
      (editing ? '<button type="button" class="btn btn-ghost btn-danger-text" data-act="delete">' + V.icon('trash', 16) + 'Eliminar</button>' : '') +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn btn-ghost" data-act="cancel">' +
      (editing ? 'Cancelar' : 'Limpiar') +
      '</button>' +
      '<button type="submit" class="btn btn-primary">' +
      (editing ? 'Guardar cambios' : 'Guardar y añadir otra') +
      ' <kbd>Ctrl ↵</kbd></button>' +
      '</div>' +
      '</form>';

    const form = V.$('#note-form');
    const $ = (id) => V.$('#' + id);

    // imagen
    const showImage = () => {
      $('image-preview').innerHTML = image ? '<img src="' + V.esc(image) + '" alt="">' : '';
      $('image-drop').classList.toggle('has-image', !!image);
      $('image-remove').hidden = !image;
    };
    showImage();
    const takeFile = async (file) => {
      if (!file || !/^image\//.test(file.type)) return;
      try {
        image = await V.compressImage(file, 480);
        showImage();
      } catch (e) {
        V.toast('No se pudo leer esa imagen.', { tone: 'bad' });
      }
    };
    $('image-drop').addEventListener('click', () => $('f-image').click());
    $('image-drop').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $('f-image').click();
      }
    });
    $('f-image').addEventListener('change', (e) => takeFile(e.target.files[0]));
    $('image-drop').addEventListener('dragover', (e) => {
      e.preventDefault();
      $('image-drop').classList.add('drag');
    });
    $('image-drop').addEventListener('dragleave', () => $('image-drop').classList.remove('drag'));
    $('image-drop').addEventListener('drop', (e) => {
      e.preventDefault();
      $('image-drop').classList.remove('drag');
      takeFile(e.dataTransfer.files[0]);
    });
    form.addEventListener('paste', (e) => {
      const item = Array.from(e.clipboardData ? e.clipboardData.items : []).find((i) => i.type.startsWith('image/'));
      if (item) {
        e.preventDefault();
        takeFile(item.getAsFile());
      }
    });
    $('image-remove').addEventListener('click', () => {
      image = '';
      $('f-image').value = '';
      showImage();
    });

    // duplicados y cloze
    const checkDup = () => {
      const dup = V.findDuplicate($('f-word').value, editing && editing.id);
      const el = $('dup');
      if (dup) {
        const d = V.deck(dup.deckId);
        el.hidden = false;
        el.innerHTML =
          V.icon('warning', 16) +
          '<span>Ya tienes «' +
          V.esc(dup.word) +
          '» en ' +
          V.esc(d ? d.name : 'otro mazo') +
          '.</span> <button type="button" class="link-btn" data-open="' +
          V.esc(dup.id) +
          '">Ver</button>';
      } else el.hidden = true;
    };
    const checkCloze = () => {
      const ok = !!V.clozeMatch({ word: $('f-word').value, example: $('f-example').value });
      const box = form.querySelector('input[value="cloze"]');
      const warn = form.querySelector('.cloze-warn');
      if (warn) warn.hidden = ok || !box.checked;
    };
    $('f-word').addEventListener('input', () => {
      checkDup();
      checkCloze();
    });
    $('f-example').addEventListener('input', checkCloze);
    form.addEventListener('change', (e) => {
      if (e.target.name === 'kind') checkCloze();
    });
    checkDup();
    checkCloze();
    $('dup').addEventListener('click', (e) => {
      const b = e.target.closest('[data-open]');
      if (b) V.go('explorar', { open: b.dataset.open });
    });
    $('f-deck').addEventListener('change', (e) => handleDeckSelect(e.target, () => deckId));

    // autocompletar
    let ctl = null;
    VocabloAI.engine().then((engine) => {
      const btn = $('ai-fill');
      if (!btn || !engine) return;
      btn.hidden = false;
      btn.querySelector('span').textContent = engine === 'claude' ? 'Autocompletar con Claude' : 'Buscar en el diccionario';
      btn.title =
        engine === 'claude'
          ? 'Claude rellena traducción, IPA, definición, ejemplo, sinónimos y una mnemotecnia'
          : 'Rellena IPA, definición y ejemplo desde un diccionario libre';
    });
    $('ai-fill').addEventListener('click', async () => {
      const word = $('f-word').value.trim();
      const status = $('ai-status');
      if (!word) {
        status.textContent = 'Escribe primero la palabra en inglés.';
        $('f-word').focus();
        return;
      }
      if (ctl) {
        ctl.abort();
        return;
      }
      ctl = new AbortController();
      const btn = $('ai-fill');
      btn.classList.add('is-busy');
      btn.querySelector('span').textContent = 'Buscando… (pulsa para parar)';
      status.textContent = '';
      try {
        const data = await VocabloAI.lookup(word, $('f-translation').value.trim(), ctl.signal);
        let filled = 0;
        for (const k of FIELDS) {
          if (k === 'word') continue;
          const el = $('f-' + k);
          if (el && !el.value.trim() && data[k]) {
            if (el.tagName === 'SELECT') {
              const v = String(data[k]).toLowerCase();
              if (Array.from(el.options).some((o) => o.value.toLowerCase() === v)) {
                el.value = Array.from(el.options).find((o) => o.value.toLowerCase() === v).value;
                filled++;
              } else if (k === 'level' && /^[abc][12]$/i.test(v)) {
                el.value = v.toUpperCase();
                filled++;
              }
            } else {
              el.value = data[k];
              filled++;
            }
          }
        }
        let msg = filled ? 'Rellené ' + filled + ' ' + V.plural(filled, 'campo', 'campos') + '. Revísalos: tú decides qué se queda.' : 'No había campos vacíos que rellenar.';
        if (data.word && V.norm(data.word) !== V.norm(word)) {
          msg += ' Forma sugerida: «' + data.word + '».';
          status.innerHTML = V.esc(msg) + ' <button type="button" class="link-btn" id="use-word">Usarla</button>';
          V.$('#use-word').addEventListener('click', () => {
            $('f-word').value = data.word;
            checkDup();
            checkCloze();
            status.textContent = 'Palabra cambiada a «' + data.word + '».';
          });
        } else status.textContent = msg;
        checkCloze();
      } catch (err) {
        status.textContent = err.message || 'No se pudo autocompletar.';
      } finally {
        ctl = null;
        const b = $('ai-fill');
        if (b) {
          b.classList.remove('is-busy');
          VocabloAI.engine().then((engine) => {
            const sp = b.querySelector('span');
            if (sp) sp.textContent = engine === 'claude' ? 'Autocompletar con Claude' : 'Buscar en el diccionario';
          });
        }
      }
    });

    // guardar
    const collect = () => {
      const f = {};
      for (const k of FIELDS) f[k] = ($('f-' + k).value || '').trim();
      f.tags = $('f-tags')
        .value.split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      f.image = image;
      const ks = {};
      V.$$('input[name="kind"]', form).forEach((c) => (ks[c.value] = c.checked));
      return { f, ks, deck: $('f-deck').value };
    };

    const submit = async () => {
      const { f, ks, deck } = collect();
      if (!f.word) {
        V.toast('Falta la palabra en inglés.', { tone: 'bad' });
        $('f-word').focus();
        return;
      }
      if (!f.translation) {
        V.toast('Falta la traducción al español.', { tone: 'bad' });
        $('f-translation').focus();
        return;
      }
      if (!Object.values(ks).some(Boolean)) {
        V.toast('Elige al menos un tipo de ficha.', { tone: 'bad' });
        return;
      }
      if (deck === '__new' || !V.deck(deck)) {
        V.toast('Elige un mazo.', { tone: 'bad' });
        return;
      }
      if (ks.cloze && !V.clozeMatch(f)) {
        ks.cloze = false;
        V.toast('No creé la ficha de completar: el ejemplo no contiene la palabra.', { timeout: 5000 });
      }
      V.state.lastDeck = deck;
      if (editing) {
        const removing = V.KIND_ORDER.filter((k) => editing.cards[k] && !ks[k] && editing.cards[k].reps > 0);
        if (removing.length) {
          const ok = await V.confirm(
            'Vas a quitar ' +
              removing.map((k) => '«' + V.KINDS[k].label + '»').join(' y ') +
              ' y se perderá su progreso de repaso.',
            { ok: 'Quitar y guardar', danger: true }
          );
          if (!ok) return;
        }
        Object.assign(editing, f, { deckId: deck });
        for (const k of V.KIND_ORDER) {
          if (ks[k] && !editing.cards[k]) editing.cards[k] = SRS.newCard();
          if (!ks[k] && editing.cards[k]) delete editing.cards[k];
        }
        if (!Object.keys(editing.cards).length) editing.cards.recognition = SRS.newCard();
        V.saveNote(editing);
        V.toast('Cambios guardados');
        V.go(p.returnTo || 'explorar', p.returnTo === 'explorar' || !p.returnTo ? { open: editing.id } : {});
      } else {
        const note = V.createNote(f, deck, ks);
        V.saveNote(note);
        V.toast('Añadida «' + note.word + '» · ' + Object.keys(note.cards).length + ' ' + V.plural(Object.keys(note.cards).length, 'ficha', 'fichas'), {
          action: {
            label: 'Deshacer',
            fn: () => {
              V.removeNote(note.id);
              V.toast('Eliminada');
            },
          },
        });
        for (const k of FIELDS) $('f-' + k).value = '';
        $('f-tags').value = f.tags.join(', ');
        image = '';
        showImage();
        $('ai-status').textContent = '';
        checkDup();
        checkCloze();
        $('f-word').focus();
      }
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submit();
    });
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submit();
      }
    });
    form.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'cancel') {
        if (editing) V.go(p.returnTo || 'explorar', p.returnTo ? {} : { open: editing.id });
        else {
          form.reset();
          image = '';
          showImage();
          checkDup();
        }
      } else if (b.dataset.act === 'delete' && editing) {
        const ok = await V.confirm('Se eliminará «' + V.esc(editing.word) + '» con todas sus fichas y su progreso.', {
          ok: 'Eliminar',
          danger: true,
          title: 'Eliminar palabra',
        });
        if (ok) {
          V.removeNote(editing.id);
          if (V.state.session && V.state.session.current && V.state.session.current.note.id === editing.id) {
            V.state.session.current = null;
            V.state.session.mode = null;
          }
          V.toast('Palabra eliminada');
          V.go(p.returnTo || 'explorar');
        }
      }
    });
    if (!editing) $('f-word').focus();
  }

  // ------------------------------------------------------- varias palabras
  function parseLines(text) {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const parts = l.split(/\t|;|\s[–—-]\s|\s=\s/);
        return { word: parts[0].trim(), translation: (parts[1] || '').trim() };
      })
      .filter((x) => x.word);
  }

  function renderBulk(body, deckId) {
    const st = V.settings();
    let rows = [];
    body.innerHTML =
      '<div class="bulk">' +
      '<label class="field"><span>Una palabra por línea. Si quieres, añade la traducción después de «;» o de un tabulador.</span>' +
      '<textarea id="bulk-input" rows="8" spellcheck="false" placeholder="thorough\nwear off ; pasarse (un efecto)\nshortage ; escasez"></textarea></label>' +
      '<div class="bulk-controls">' +
      '<label class="field"><span>Mazo</span><select id="bulk-deck">' +
      deckOptions(deckId) +
      '</select></label>' +
      '<div class="row-actions">' +
      '<button class="btn btn-ai" id="bulk-ai" hidden>' +
      V.icon('sparkle', 18) +
      '<span>Completar con Claude</span></button>' +
      '<button class="btn btn-ghost" id="bulk-plain">Revisar sin completar</button>' +
      '</div></div>' +
      '<p class="field-hint" id="bulk-status" aria-live="polite"></p>' +
      '<div id="bulk-preview"></div>' +
      '</div>';

    const $ = (id) => V.$('#' + id);
    $('bulk-deck').addEventListener('change', (e) => handleDeckSelect(e.target, () => deckId));
    VocabloAI.engine().then((engine) => {
      const b = $('bulk-ai');
      if (!b || !engine) return;
      b.hidden = false;
      b.querySelector('span').textContent = engine === 'claude' ? 'Completar con Claude' : 'Completar con el diccionario';
    });

    const drawPreview = () => {
      const box = $('bulk-preview');
      if (!rows.length) {
        box.innerHTML = '';
        return;
      }
      const ok = rows.filter((r) => r.include && r.translation).length;
      box.innerHTML =
        '<div class="table-wrap"><table class="bulk-table"><thead><tr><th><span class="sr-only">Incluir</span></th><th>Palabra</th><th>Traducción</th><th>Definición / ejemplo</th></tr></thead><tbody>' +
        rows
          .map(
            (r, i) =>
              '<tr class="' +
              (r.dup ? 'is-dup' : '') +
              '"><td><input type="checkbox" data-row="' +
              i +
              '" aria-label="Incluir ' +
              V.esc(r.word) +
              '"' +
              (r.include ? ' checked' : '') +
              '></td><td><strong>' +
              V.esc(r.word) +
              '</strong>' +
              (r.ipa ? '<br><span class="ipa small">' + V.esc(r.ipa) + '</span>' : '') +
              (r.dup ? '<br><span class="small warn-text">Ya existe</span>' : '') +
              '</td><td><input class="cell-input" data-tr="' +
              i +
              '" value="' +
              V.esc(r.translation) +
              '" placeholder="Falta traducción" aria-label="Traducción de ' +
              V.esc(r.word) +
              '"></td><td class="small muted">' +
              V.esc(r.definition || '') +
              (r.example ? '<br><em>' + V.esc(r.example) + '</em>' : '') +
              '</td></tr>'
          )
          .join('') +
        '</tbody></table></div>' +
        '<div class="row-actions end"><button class="btn btn-primary" id="bulk-save">Guardar ' +
        ok +
        ' ' +
        V.plural(ok, 'palabra', 'palabras') +
        '</button></div>';
      box.querySelectorAll('[data-row]').forEach((c) =>
        c.addEventListener('change', () => {
          rows[+c.dataset.row].include = c.checked;
          drawPreview();
        })
      );
      box.querySelectorAll('[data-tr]').forEach((inp) =>
        inp.addEventListener('change', () => {
          rows[+inp.dataset.tr].translation = inp.value.trim();
          drawPreview();
        })
      );
      $('bulk-save').addEventListener('click', save);
    };

    const prepare = (items) => {
      rows = items.map((it) => {
        const dup = !!V.findDuplicate(it.word);
        return Object.assign(
          { pos: '', ipa: '', level: '', definition: '', example: '', exampleTr: '', synonyms: '', mnemonic: '' },
          it,
          { dup, include: !dup }
        );
      });
      drawPreview();
    };

    $('bulk-plain').addEventListener('click', () => {
      const items = parseLines($('bulk-input').value);
      if (!items.length) {
        $('bulk-status').textContent = 'Escribe al menos una palabra.';
        return;
      }
      $('bulk-status').textContent = items.some((x) => !x.translation)
        ? 'Completa las traducciones que faltan antes de guardar.'
        : '';
      prepare(items);
    });

    let ctl = null;
    $('bulk-ai').addEventListener('click', async () => {
      const items = parseLines($('bulk-input').value);
      const status = $('bulk-status');
      if (!items.length) {
        status.textContent = 'Escribe al menos una palabra.';
        return;
      }
      if (items.length > 100) {
        status.textContent = 'Como máximo 100 palabras a la vez.';
        return;
      }
      if (ctl) {
        ctl.abort();
        return;
      }
      ctl = new AbortController();
      const btn = $('bulk-ai');
      btn.classList.add('is-busy');
      btn.querySelector('span').textContent = 'Completando… (pulsa para parar)';
      status.textContent = 'Preparando ' + items.length + ' ' + V.plural(items.length, 'palabra', 'palabras') + '…';
      try {
        const words = items.map((x) => (x.translation ? x.word + ' ; ' + x.translation : x.word));
        const data = await VocabloAI.lookupMany(words, ctl.signal, (done, total) => {
          status.textContent = 'Completadas ' + done + ' de ' + total + '…';
        });
        prepare(
          items.map((it, i) => {
            const d = data[i] || {};
            return Object.assign({}, d, {
              word: d.word && V.norm(d.word) !== V.norm(it.word) && !/;/.test(d.word) ? d.word : it.word,
              translation: it.translation || d.translation || '',
            });
          })
        );
        status.textContent = 'Revisa la tabla, corrige lo que quieras y guarda.';
      } catch (err) {
        status.textContent = err.message || 'No se pudo completar.';
      } finally {
        ctl = null;
        const b = $('bulk-ai');
        if (b) {
          b.classList.remove('is-busy');
          VocabloAI.engine().then((engine) => {
            const sp = b.querySelector('span');
            if (sp) sp.textContent = engine === 'claude' ? 'Completar con Claude' : 'Completar con el diccionario';
          });
        }
      }
    });

    function save() {
      const deck = $('bulk-deck').value;
      if (!V.deck(deck)) {
        V.toast('Elige un mazo.', { tone: 'bad' });
        return;
      }
      const chosen = rows.filter((r) => r.include && r.translation);
      if (!chosen.length) {
        V.toast('No hay palabras con traducción seleccionadas.', { tone: 'bad' });
        return;
      }
      const base = Date.now();
      chosen.forEach((r, i) => {
        const fields = {};
        for (const k of FIELDS) fields[k] = r[k] || '';
        fields.pos = Object.keys(V.POS).includes(String(fields.pos).toLowerCase()) ? String(fields.pos).toLowerCase() : '';
        fields.level = /^[ABC][12]$/i.test(fields.level) ? fields.level.toUpperCase() : '';
        const note = V.createNote(fields, deck, st.cardKinds);
        note.createdAt = base + i; // conserva el orden de la lista
        V.saveNote(note);
      });
      V.state.lastDeck = deck;
      V.toast('Guardadas ' + chosen.length + ' ' + V.plural(chosen.length, 'palabra', 'palabras'));
      rows = [];
      $('bulk-input').value = '';
      $('bulk-status').textContent = '';
      drawPreview();
    }
  }
})();
