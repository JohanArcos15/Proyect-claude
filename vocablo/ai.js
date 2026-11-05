/*
 * Vocablo · autocompletar fichas
 *
 * 1) Dentro de claude.ai: pide a Claude (capacidad "sample") la traducción,
 *    la IPA, la definición, un ejemplo, sinónimos, nivel MCER y una
 *    mnemotecnia. Gasta un poco del uso de Claude de quien la pulsa.
 * 2) Fuera de claude.ai: Free Dictionary API (dictionaryapi.dev) para IPA,
 *    definición y ejemplo + MyMemory para una traducción orientativa.
 */
(function (root) {
  'use strict';

  const FIELDS = {
    word: 'forma canónica en inglés (corrige la ortografía si hace falta)',
    translation: '1-3 traducciones al español, la más común primero, separadas por coma',
    pos: 'una de: noun, verb, adjective, adverb, phrasal verb, idiom, preposition, conjunction, pronoun, interjection, expression',
    ipa: 'transcripción IPA (inglés americano) entre barras, p. ej. /ˈwɔːtər/',
    definition: "definición breve en inglés sencillo, estilo learner's dictionary",
    example: 'una oración natural en inglés de 8 a 16 palabras que contenga la palabra exactamente como está escrita',
    exampleTr: 'traducción natural de esa oración al español',
    synonyms: '2-4 sinónimos en inglés separados por coma, o cadena vacía',
    level: 'nivel MCER aproximado: A1, A2, B1, B2, C1 o C2',
    mnemonic: 'truco breve en español para recordarla (raíz, parecido, imagen); máximo 25 palabras',
  };

  function schemaText() {
    return (
      '{\n' +
      Object.entries(FIELDS)
        .map(([k, v]) => '  "' + k + '": "' + v + '"')
        .join(',\n') +
      '\n}'
    );
  }

  let samplePromise = null;
  function getSample() {
    if (!samplePromise) {
      samplePromise =
        root.claude && typeof root.claude.use === 'function'
          ? root.claude.use('sample').catch(() => null)
          : Promise.resolve(null);
    }
    return samplePromise;
  }

  function insideClaude() {
    return !!(root.claude && typeof root.claude.use === 'function');
  }

  function clean(obj) {
    const out = {};
    for (const k of Object.keys(FIELDS)) {
      const v = obj && obj[k];
      out[k] = typeof v === 'string' ? v.trim() : Array.isArray(v) ? v.join(', ') : '';
    }
    return out;
  }

  const ERRORS = {
    not_granted: 'No diste permiso para usar Claude en esta página.',
    sampling_disabled: 'Claude no está disponible para esta cuenta.',
    rate_limited: 'Demasiadas consultas seguidas. Espera un momento y vuelve a intentarlo.',
    session_expired: 'Tu sesión caducó. Vuelve a iniciar sesión en claude.ai.',
    refused: 'Claude no pudo completar esta palabra. Prueba con otra forma.',
    invalid_json: 'La respuesta llegó incompleta. Vuelve a intentarlo.',
    cancelled: 'Cancelado.',
    offline: 'No hay conexión con el diccionario.',
    not_found: 'No encontré esa palabra en el diccionario.',
    unavailable: 'El autocompletado no está disponible aquí.',
  };

  function friendly(err) {
    const code = (err && err.code) || 'upstream_error';
    const msg = ERRORS[code] || 'No se pudo completar. Vuelve a intentarlo.';
    const e = new Error(msg);
    e.code = code;
    return e;
  }

  async function viaClaude(sample, words, context, signal) {
    const many = words.length > 1;
    const prompt =
      'Eres un lexicógrafo bilingüe que prepara fichas de vocabulario de inglés para un estudiante hispanohablante.\n' +
      (many
        ? 'Palabras o expresiones en inglés (una por línea; si una línea trae "palabra ; pista", la pista indica el sentido que interesa):\n' +
          words.map((w) => '- ' + w).join('\n') +
          '\n\nResponde SOLO con un array JSON con un objeto por palabra, en el mismo orden, cada uno con esta forma:\n'
        : 'Palabra o expresión en inglés: "' +
          words[0] +
          '"\n' +
          (context ? 'Sentido que interesa (pista del estudiante): "' + context + '"\n' : '') +
          '\nResponde SOLO con un objeto JSON con esta forma:\n') +
      schemaText();
    try {
      const data = await sample.json(prompt, { modelTier: 'quick', signal });
      if (many) {
        const arr = Array.isArray(data) ? data : [];
        return words.map((w, i) => Object.assign(clean(arr[i]), { word: (arr[i] && arr[i].word) || w }));
      }
      const obj = Array.isArray(data) ? data[0] : data;
      return [Object.assign(clean(obj), { word: (obj && obj.word) || words[0] })];
    } catch (err) {
      throw friendly(err);
    }
  }

  async function viaDictionary(word, signal) {
    const out = clean({ word });
    let res;
    try {
      res = await fetch(
        'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word.toLowerCase()),
        { signal }
      );
    } catch (e) {
      if (e && e.name === 'AbortError') throw friendly({ code: 'cancelled' });
      throw friendly({ code: 'offline' });
    }
    if (res.ok) {
      const entries = await res.json();
      const e = entries[0] || {};
      const phon = (e.phonetics || []).find((p) => p.text) || {};
      out.ipa = e.phonetic || phon.text || '';
      const meaning = (e.meanings || [])[0] || {};
      out.pos = meaning.partOfSpeech || '';
      const defs = meaning.definitions || [];
      const withEx = defs.find((d) => d.example) || defs[0] || {};
      out.definition = (defs[0] && defs[0].definition) || '';
      for (const m of e.meanings || []) {
        const d = (m.definitions || []).find((x) => x.example);
        if (d) {
          out.example = d.example;
          break;
        }
      }
      if (!out.example && withEx.example) out.example = withEx.example;
      const syn = new Set();
      for (const m of e.meanings || []) {
        (m.synonyms || []).forEach((s) => syn.size < 4 && syn.add(s));
      }
      out.synonyms = Array.from(syn).join(', ');
    } else if (res.status !== 404) {
      throw friendly({ code: 'offline' });
    }
    try {
      const t = await fetch(
        'https://api.mymemory.translated.net/get?langpair=en|es&q=' + encodeURIComponent(word),
        { signal }
      );
      if (t.ok) {
        const j = await t.json();
        const tr = j && j.responseData && j.responseData.translatedText;
        if (tr && tr.toLowerCase() !== word.toLowerCase()) out.translation = tr.toLowerCase();
      }
    } catch (e) {
      /* la traducción es opcional */
    }
    if (!out.definition && !out.translation) throw friendly({ code: 'not_found' });
    return out;
  }

  const VocabloAI = {
    insideClaude,
    /** ¿Qué motor usará? "claude", "dictionary" o null. */
    async engine() {
      if (insideClaude()) return (await getSample()) ? 'claude' : null;
      return typeof fetch === 'function' ? 'dictionary' : null;
    },
    /** Rellena una palabra. */
    async lookup(word, context, signal) {
      const sample = await getSample();
      if (sample) return (await viaClaude(sample, [word], context, signal))[0];
      if (insideClaude()) throw friendly({ code: 'unavailable' });
      return viaDictionary(word, signal);
    },
    /** Rellena varias palabras (máximo 25 por llamada con Claude). */
    async lookupMany(words, signal, onProgress) {
      const sample = await getSample();
      const out = [];
      if (sample) {
        for (let i = 0; i < words.length; i += 25) {
          const chunk = words.slice(i, i + 25);
          out.push(...(await viaClaude(sample, chunk, '', signal)));
          onProgress && onProgress(out.length, words.length);
        }
        return out;
      }
      if (insideClaude()) throw friendly({ code: 'unavailable' });
      for (const w of words) {
        try {
          out.push(await viaDictionary(w.split(';')[0].trim(), signal));
        } catch (e) {
          if (e.code === 'cancelled') throw e;
          out.push(clean({ word: w }));
        }
        onProgress && onProgress(out.length, words.length);
      }
      return out;
    },
  };

  root.VocabloAI = VocabloAI;
})(typeof self !== 'undefined' ? self : this);
