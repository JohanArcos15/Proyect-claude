/*
 * Vocablo · almacenamiento
 *
 * Misma interfaz para dos destinos:
 *  - "cloud": la base de datos privada del artefacto en claude.ai
 *    (data/users/<tu id>/vocablo/...). Se sincroniza entre dispositivos.
 *  - "local": IndexedDB del navegador (o localStorage si IndexedDB falla).
 *
 * Documentos:
 *   meta            { decks, settings, ... }
 *   notes/<id>      una palabra con sus fichas y su estado de repaso
 *   logs/<día>      { day, entries: [...] } respuestas de ese día
 */
(function (root) {
  'use strict';

  const DB_NAME = 'vocablo';
  const DB_VERSION = 1;

  // ------------------------------------------------- cola de escritura
  // Una escritura a la vez por documento; si llegan varias seguidas,
  // solo se escribe la última (coalescencia).
  function createWriter(write, status) {
    const pending = new Map();
    const running = new Set();
    let inflight = 0;
    const notify = () => status && status(inflight + pending.size > 0 ? 'saving' : 'saved');

    async function flush(key) {
      if (running.has(key)) return;
      running.add(key);
      try {
        while (pending.has(key)) {
          const job = pending.get(key);
          pending.delete(key);
          inflight++;
          notify();
          try {
            await write(key, job);
          } catch (err) {
            const code = err && err.code;
            if (code === 'unavailable' || code === 'resource_exhausted') {
              await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
              try {
                await write(key, job);
              } catch (err2) {
                status && status('error', err2);
              }
            } else {
              status && status('error', err);
            }
          } finally {
            inflight--;
          }
        }
      } finally {
        running.delete(key);
        notify();
      }
    }

    return {
      push(key, job) {
        pending.set(key, job);
        notify();
        flush(key);
      },
      get busy() {
        return inflight + pending.size > 0;
      },
    };
  }

  // ---------------------------------------------------------- IndexedDB
  function idbOpen() {
    return new Promise((resolve, reject) => {
      let req;
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        reject(e);
        return;
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('logs')) db.createObjectStore('logs', { keyPath: 'day' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB bloqueada'));
    });
  }

  function idbAll(db, store) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  function idbGet(db, store, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function idbDo(db, store, fn) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      fn(tx.objectStore(store));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function localBackend(status) {
    let db = null;
    try {
      db = await idbOpen();
    } catch (e) {
      db = null;
    }
    if (db) {
      const writer = createWriter(async (key, job) => {
        const [store, id] = key.split('|');
        if (store === 'meta') return idbDo(db, 'kv', (s) => s.put(job.data, 'meta'));
        if (job.op === 'delete') return idbDo(db, store, (s) => s.delete(id));
        return idbDo(db, store, (s) => s.put(job.data));
      }, status);
      return {
        kind: 'local',
        label: 'Este navegador',
        async loadAll() {
          const [meta, notes, logs] = await Promise.all([
            idbGet(db, 'kv', 'meta'),
            idbAll(db, 'notes'),
            idbAll(db, 'logs'),
          ]);
          return { meta: meta || null, notes, logs };
        },
        putMeta(meta) {
          writer.push('meta|', { data: clone(meta) });
        },
        putNote(note) {
          writer.push('notes|' + note.id, { data: clone(note) });
        },
        deleteNote(id) {
          writer.push('notes|' + id, { op: 'delete' });
        },
        putLog(day) {
          writer.push('logs|' + day.day, { data: clone(day) });
        },
        deleteLog(key) {
          writer.push('logs|' + key, { op: 'delete' });
        },
        async clear() {
          await idbDo(db, 'notes', (s) => s.clear());
          await idbDo(db, 'logs', (s) => s.clear());
          await idbDo(db, 'kv', (s) => s.clear());
        },
        get busy() {
          return writer.busy;
        },
      };
    }
    return storageBackend(status);
  }

  // Último recurso: localStorage (o memoria si tampoco existe).
  function storageBackend(status) {
    let ls = null;
    try {
      ls = root.localStorage;
      ls.setItem('vocablo:test', '1');
      ls.removeItem('vocablo:test');
    } catch (e) {
      ls = null;
    }
    const mem = { meta: null, notes: {}, logs: {} };
    const read = () => {
      if (!ls) return mem;
      try {
        const raw = ls.getItem('vocablo:data');
        return raw ? JSON.parse(raw) : { meta: null, notes: {}, logs: {} };
      } catch (e) {
        return { meta: null, notes: {}, logs: {} };
      }
    };
    let state = read();
    let timer = null;
    const save = () => {
      if (!ls) return;
      clearTimeout(timer);
      status && status('saving');
      timer = setTimeout(() => {
        try {
          ls.setItem('vocablo:data', JSON.stringify(state));
          status && status('saved');
        } catch (e) {
          status && status('error', e);
        }
      }, 150);
    };
    return {
      kind: ls ? 'local' : 'memory',
      label: ls ? 'Este navegador' : 'Solo esta sesión',
      async loadAll() {
        return {
          meta: state.meta,
          notes: Object.values(state.notes),
          logs: Object.values(state.logs),
        };
      },
      putMeta(meta) {
        state.meta = clone(meta);
        save();
      },
      putNote(note) {
        state.notes[note.id] = clone(note);
        save();
      },
      deleteNote(id) {
        delete state.notes[id];
        save();
      },
      putLog(day) {
        state.logs[day.day] = clone(day);
        save();
      },
      deleteLog(key) {
        delete state.logs[key];
        save();
      },
      async clear() {
        state = { meta: null, notes: {}, logs: {} };
        save();
      },
      get busy() {
        return false;
      },
    };
  }

  // -------------------------------------------- base de datos de Claude
  async function readCollection(col, field) {
    const out = [];
    let last = null;
    for (let page = 0; page < 200; page++) {
      let q = col.orderBy(field).limit(500);
      if (last !== null) q = col.where(field, '>', last).orderBy(field).limit(500);
      const snap = await q.get();
      for (const d of snap.docs) {
        // La base de datos de Claude entrega objetos congelados (solo lectura):
        // la app trabaja siempre sobre una copia editable.
        const data = d.data();
        if (data) out.push(clone(data));
      }
      if (snap.size < 500) break;
      last = snap.docs[snap.docs.length - 1].data()[field];
    }
    return out;
  }

  async function cloudBackend(db, uid, status) {
    const rootRef = db.doc('data/users/' + uid + '/vocablo');
    const notes = rootRef.collection('notes');
    const logs = rootRef.collection('logs');
    const writer = createWriter(async (key, job) => {
      const [store, id] = key.split('|');
      if (store === 'meta') return rootRef.set(job.data);
      const col = store === 'notes' ? notes : logs;
      if (job.op === 'delete') return col.doc(id).delete();
      return col.doc(id).set(job.data);
    }, status);
    return {
      kind: 'cloud',
      label: 'Tu cuenta de Claude',
      async loadAll() {
        const metaSnap = await rootRef.get();
        let noteList;
        let logList;
        try {
          [noteList, logList] = await Promise.all([
            readCollection(notes, 'id'),
            readCollection(logs, 'day'),
          ]);
        } catch (e) {
          if (e && e.code === 'invalid_argument') {
            const [a, b] = await Promise.all([notes.get(), logs.get()]);
            noteList = a.docs.map((d) => d.data()).filter(Boolean).map(clone);
            logList = b.docs.map((d) => d.data()).filter(Boolean).map(clone);
          } else {
            throw e;
          }
        }
        return {
          meta: metaSnap.exists && metaSnap.data() ? clone(metaSnap.data()) : null,
          notes: noteList,
          logs: logList,
        };
      },
      putMeta(meta) {
        writer.push('meta|', { data: clone(meta) });
      },
      putNote(note) {
        writer.push('notes|' + note.id, { data: clone(note) });
      },
      deleteNote(id) {
        writer.push('notes|' + id, { op: 'delete' });
      },
      putLog(day) {
        writer.push('logs|' + day.day, { data: clone(day) });
      },
      deleteLog(key) {
        writer.push('logs|' + key, { op: 'delete' });
      },
      async clear() {
        throw new Error('clear no se usa en la nube');
      },
      get busy() {
        return writer.busy;
      },
    };
  }

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  }

  /**
   * Abre el mejor almacenamiento disponible.
   * Devuelve { backend, local } — `local` solo se rellena cuando el
   * principal es la nube, para poder migrar datos antiguos del navegador.
   */
  async function open(status) {
    const claude = root.claude;
    if (claude && typeof claude.use === 'function') {
      try {
        const [db, user] = await withTimeout(
          Promise.all([claude.use('db'), claude.use('user')]),
          12000
        ) || [null, null];
        const uid = user ? await user.id() : null;
        if (db && uid) {
          const backend = await cloudBackend(db, uid, status);
          return { backend, local: () => localBackend(null) };
        }
      } catch (e) {
        // sin nube: seguimos en local
      }
    }
    return { backend: await localBackend(status), local: null };
  }

  root.VocabloStorage = { open, createWriter };
})(typeof self !== 'undefined' ? self : this);
