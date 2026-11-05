/* Vocablo · arranque */
(function () {
  'use strict';
  const V = window.V;

  const NAV = [
    ['hoy', 'home', 'Hoy'],
    ['anadir', 'plus', 'Añadir'],
    ['explorar', 'list', 'Explorar'],
    ['progreso', 'chart', 'Progreso'],
    ['ajustes', 'sliders', 'Ajustes'],
  ];

  function buildChrome() {
    const nav = V.$('#nav');
    nav.innerHTML = NAV.map(
      ([id, icon, label]) => '<a href="#' + id + '" data-nav="' + id + '">' + V.icon(icon, 22) + '<span>' + label + '</span></a>'
    ).join('');
  }

  function loading(msg) {
    V.$('#view').innerHTML =
      '<section class="page boot"><div class="boot-card"><div class="boot-lines" aria-hidden="true"><span></span><span></span><span></span></div><p>' +
      V.esc(msg) +
      '</p></div></section>';
  }

  function failure(err) {
    V.$('#view').innerHTML =
      '<section class="page boot"><div class="boot-card"><h1>No pude abrir tus fichas</h1><p>' +
      V.esc((err && (err.message || err.code)) || 'Error desconocido') +
      '</p><p class="muted small">Comprueba tu conexión y vuelve a intentarlo. Tus datos no se han tocado.</p><button class="btn btn-primary" id="retry">Reintentar</button></div></section>';
    V.$('#retry').addEventListener('click', () => location.reload());
  }

  function hydrate(data) {
    V.state.meta = V.normalizeMeta(data.meta);
    V.state.notes = new Map();
    for (const n of data.notes || []) if (n && n.id && n.cards) V.state.notes.set(n.id, n);
    V.state.logs = new Map();
    for (const d of data.logs || []) if (d && d.day && Array.isArray(d.entries)) V.state.logs.set(d.day, d);
  }

  /** Trae cambios hechos en otro dispositivo (gana la versión más reciente). */
  async function resync() {
    const b = V.state.backend;
    if (!b || b.kind !== 'cloud' || b.busy || V.state.view === 'estudiar') return;
    const started = Date.now();
    try {
      const data = await b.loadAll();
      let changed = false;
      if (data.meta && JSON.stringify(data.meta) !== JSON.stringify(V.state.meta)) {
        V.state.meta = V.normalizeMeta(data.meta);
        changed = true;
      }
      const remote = new Set();
      for (const n of data.notes) {
        remote.add(n.id);
        const cur = V.state.notes.get(n.id);
        if (!cur || (n.updatedAt || 0) > (cur.updatedAt || 0)) {
          V.state.notes.set(n.id, n);
          changed = true;
        }
      }
      for (const [id, n] of Array.from(V.state.notes.entries())) {
        // borrada en otro dispositivo (y no tocada aquí mientras leíamos)
        if (!remote.has(id) && !b.busy && (n.updatedAt || 0) < started - 5000) {
          V.state.notes.delete(id);
          changed = true;
        }
      }
      for (const d of data.logs) {
        const cur = V.state.logs.get(d.day);
        if (!cur || d.entries.length > cur.entries.length) {
          V.state.logs.set(d.day, d);
          changed = true;
        }
      }
      if (changed && V.state.view !== 'anadir' && !document.querySelector('.modal-backdrop')) {
        V.state.keepScroll = true;
        V.applyTheme();
        V.render();
      }
    } catch (e) {
      /* sin conexión: seguimos con lo que hay */
    }
  }

  async function boot() {
    buildChrome();
    loading('Abriendo tus fichas…');
    let opened;
    try {
      opened = await VocabloStorage.open(V.setSync);
    } catch (e) {
      failure(e);
      return;
    }
    V.state.backend = opened.backend;
    let data;
    try {
      data = await opened.backend.loadAll();
    } catch (e) {
      failure(e);
      return;
    }
    // Primera vez en la nube: si este navegador tenía fichas, súbelas.
    if (opened.backend.kind === 'cloud' && !data.meta && !data.notes.length && opened.local) {
      try {
        const local = await opened.local();
        const old = await local.loadAll();
        if (old.notes.length) {
          data = old;
          hydrate(data);
          V.saveMeta();
          for (const n of V.state.notes.values()) V.saveNote(n, false);
          for (const d of V.state.logs.values()) V.saveLogDay(d);
          setTimeout(() => V.toast('Subí a tu cuenta las ' + old.notes.length + ' palabras que tenías en este navegador.', { timeout: 6000 }), 600);
        }
      } catch (e) {
        /* nada que migrar */
      }
    }
    hydrate(data);
    if (!data.meta) V.saveMeta();
    V.state.ready = true;
    V.applyTheme();
    V.setSync('saved');
    V.render();

    window.addEventListener('hashchange', () => {
      // Ya mostramos esa vista (la puso V.go): no redibujar ni perder sus parámetros.
      if ((location.hash.slice(1) || 'hoy') === V.state.view) return;
      V.state.params = {};
      if (location.hash.slice(1) !== 'estudiar' && V.state.session && V.state.view === 'estudiar') {
        // salir de la sesión con el botón atrás
        V.state.session = null;
      }
      V.render();
    });

    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 60000) {
        resync();
        if (V.state.view === 'hoy') {
          V.state.keepScroll = true;
          V.render();
        }
      }
    });

    window.addEventListener('beforeunload', (e) => {
      if (V.state.backend && V.state.backend.busy) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // App instalable fuera de claude.ai
    if ('serviceWorker' in navigator && !window.claude && /^https?:$/.test(location.protocol) && document.querySelector('link[rel="manifest"]')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
