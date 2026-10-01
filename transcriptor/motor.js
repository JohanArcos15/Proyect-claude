// Motor de Audio a TXT: Whisper (tiny o base) sobre onnxruntime-web, dentro de un Worker.
// La página descarga el modelo, corta el audio en tramos de hasta 30 s y reparte
// bloques de tramos consecutivos entre varios motores; cada uno devuelve el texto
// tramo a tramo. Los modelos salen de scripts/construir_transcriptor.py.
import * as ort from './ort/ort.wasm.bundle.min.mjs';

const MAX_TOKENS = 224;          // por tramo; con 200 de contexto cabe en los 448 de Whisper
const MAX_CONTEXTO = 200;

// Frases con puntuación que orientan al modelo a escribir con signos y mayúsculas
const FRASE_INICIAL = {
  es: ' Hola, ¿qué tal? Hoy vamos a hablar de esto.',
  en: ' Hello, how are you? Today we are going to talk about this.',
  pt: ' Olá, tudo bem? Hoje vamos falar sobre isso.',
  fr: " Bonjour, comment ça va ? Aujourd'hui, nous allons parler de cela.",
  it: ' Ciao, come stai? Oggi parleremo di questo.',
  de: ' Hallo, wie geht es dir? Heute sprechen wir darüber.',
  ca: " Hola, què tal? Avui parlarem d'això.",
};

let vocab = null;     // id -> bytes
let rangos = null;    // bytes (latin1) -> id
let motor = null;     // { enc, dec, c }
let cancelado = false;

class Cancelado extends Error {}

function prepararVocab(texto) {
  vocab = [];
  rangos = new Map();
  for (const linea of texto.split('\n')) {
    const i = linea.lastIndexOf(' ');
    if (i <= 0) continue;
    let bin = '';
    try { bin = atob(linea.slice(0, i)); } catch { continue; }
    const id = Number(linea.slice(i + 1));
    vocab[id] = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    rangos.set(bin, id);
  }
}

function prepararConfig(c) {
  const codigos = c.all_language_codes.split(',');
  const ids = c.all_language_tokens.split(',').map(Number);
  return {
    L: c.n_text_layer, H: c.n_text_head, dh: c.dh,
    sot: +c.sot, eot: +c.eot, transcribir: +c.transcribe, sinTiempos: +c.no_timestamps,
    noHabla: +c.no_speech, sotPrev: +c.sot_prev,
    idiomas: new Map(codigos.map((k, i) => [k, ids[i]])),
    suprimidos: Int32Array.from(c.non_speech_tokens.split(',').map(Number)),
  };
}

async function iniciar({ wasm, tokens, config, enc, dec }) {
  if (!ort.env.wasm.wasmBinary) {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.logLevel = 'error';
    ort.env.wasm.wasmBinary = wasm;
  }
  if (!vocab) prepararVocab(tokens);
  if (motor) {
    await motor.enc.release();
    await motor.dec.release();
    motor = null;
  }
  const opciones = { executionProviders: ['wasm'], graphOptimizationLevel: 'all', logSeverityLevel: 3 };
  motor = {
    enc: await ort.InferenceSession.create(new Uint8Array(enc), opciones),
    dec: await ort.InferenceSession.create(new Uint8Array(dec), opciones),
    c: prepararConfig(config),
  };
}

// ---------- texto <-> tokens ----------

const PATRON = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
const codificador = new TextEncoder();

// BPE de tiktoken: el id de cada token es también su rango de fusión
function codificar(texto) {
  const salida = [];
  for (const m of texto.matchAll(PATRON)) {
    const partes = Array.from(codificador.encode(m[0]), (b) => String.fromCharCode(b));
    while (partes.length > 1) {
      let mejor = -1, rango = Infinity;
      for (let i = 0; i < partes.length - 1; i++) {
        const r = rangos.get(partes[i] + partes[i + 1]);
        if (r !== undefined && r < rango) { rango = r; mejor = i; }
      }
      if (mejor < 0) break;
      partes.splice(mejor, 2, partes[mejor] + partes[mejor + 1]);
    }
    for (const p of partes) {
      const id = rangos.get(p);
      if (id !== undefined) salida.push(id);
    }
  }
  return salida;
}

function decodificarTexto(ids) {
  let n = 0;
  for (const t of ids) n += vocab[t]?.length ?? 0;
  const b = new Uint8Array(n);
  let o = 0;
  for (const t of ids) { const v = vocab[t]; if (v) { b.set(v, o); o += v.length; } }
  return new TextDecoder().decode(b).trim();
}

// Ventanas de 400 muestras cada 160 sobre 30 s con relleno reflejado (como torch.stft center=True)
function ventanas(pcm, ini, fin) {
  const N = 480000;
  const largo = Math.min(fin - ini, N);
  const f = new Float32Array(3000 * 400);
  for (let t = 0; t < 3000; t++) {
    const base = t * 160 - 200;
    const fila = t * 400;
    for (let k = 0; k < 400; k++) {
      let j = base + k;
      if (j < 0) j = -j;
      else if (j >= N) j = 2 * (N - 1) - j;
      f[fila + k] = j < largo ? pcm[ini + j] : 0;
    }
  }
  return f;
}

// ---------- decodificación ----------

function vacio(c) {
  const p = [];
  for (let i = 0; i < c.L; i++) {
    p.push(new ort.Tensor('float32', new Float32Array(0), [c.H, c.dh, 0]));
    p.push(new ort.Tensor('float32', new Float32Array(0), [c.H, 0, c.dh]));
  }
  return p;
}

async function paso(ids, pasado, cruz) {
  const c = motor.c;
  const feeds = { tokens: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [ids.length]), ...cruz };
  for (let i = 0; i < c.L; i++) {
    feeds['past_k' + i] = pasado[2 * i];
    feeds['past_v' + i] = pasado[2 * i + 1];
  }
  const r = await motor.dec.run(feeds);
  const nuevo = [];
  for (let i = 0; i < c.L; i++) nuevo.push(r['present_k' + i], r['present_v' + i]);
  return { logits: r.logits.data, pasado: nuevo };
}

function logSumaExp(v) {
  let m = -Infinity;
  for (let i = 0; i < v.length; i++) if (v[i] > m) m = v[i];
  let s = 0;
  for (let i = 0; i < v.length; i++) s += Math.exp(v[i] - m);
  return m + Math.log(s);
}

function muestrear(lg, temp) {
  let m = -Infinity;
  for (let i = 0; i < lg.length; i++) if (lg[i] > m) m = lg[i];
  let s = 0;
  const p = new Float64Array(lg.length);
  for (let i = 0; i < lg.length; i++) { p[i] = Math.exp((lg[i] - m) / temp); s += p[i]; }
  let u = Math.random() * s;
  for (let i = 0; i < p.length; i++) { u -= p[i]; if (u <= 0) return i; }
  return p.length - 1;
}

// Bucle de alucinación: el final se repite en bloque varias veces seguidas.
// Devuelve dónde cortar para quedarse con una sola copia, o 0.
function repeticion(t) {
  const n = t.length;
  for (let k = 1; k <= 40; k++) {
    const veces = k === 1 ? 12 : k <= 3 ? 6 : k <= 6 ? 4 : 3;
    if (k * veces > n) break;
    let igual = true;
    for (let i = n - k * veces; i < n - k && igual; i++) if (t[i] !== t[i + k]) igual = false;
    if (igual) return n - k * (veces - 1);
  }
  return 0;
}

async function decodificar(cruz, prefijo, idioma, temp) {
  const c = motor.c;
  let r = await paso([...prefijo, c.sot], vacio(c), cruz);
  const pNoHabla = Math.exp(r.logits[c.noHabla] - logSumaExp(r.logits));
  if (!idioma) {
    let mejor = -Infinity;
    for (const [codigo, id] of c.idiomas) if (r.logits[id] > mejor) { mejor = r.logits[id]; idioma = codigo; }
  }
  r = await paso([c.idiomas.get(idioma), c.transcribir, c.sinTiempos], r.pasado, cruz);
  let tokens = [];
  let sumaLp = 0, repetido = false;
  for (let s = 0; s < MAX_TOKENS; s++) {
    if (cancelado) throw new Cancelado();
    const lg = r.logits;
    lg.fill(-Infinity, c.eot + 1);
    for (const t of c.suprimidos) lg[t] = -Infinity;
    if (s === 0) { lg[220] = -Infinity; lg[c.eot] = -Infinity; }
    let t = 0;
    if (temp > 0) t = muestrear(lg, temp);
    else for (let i = 1; i <= c.eot; i++) if (lg[i] > lg[t]) t = i;
    sumaLp += lg[t] - logSumaExp(lg.subarray(0, c.eot + 1));
    if (t === c.eot) break;
    tokens.push(t);
    const corte = repeticion(tokens);
    if (corte) { tokens = tokens.slice(0, corte); repetido = true; break; }
    r = await paso([t], r.pasado, cruz);
  }
  return { tokens, idioma, pNoHabla, lpMedio: sumaLp / (tokens.length + 1), repetido };
}

// Un bloque: tramos consecutivos de un archivo, con el contexto encadenado entre ellos
async function bloque({ archivo, pcm, tramos, idioma, vocabulario }) {
  const c = motor.c;
  let lengua = idioma === 'auto' ? null : idioma;
  let anterior = [];
  for (const { i, ini, fin, silencio } of tramos) {
    if (cancelado) throw new Cancelado();
    let texto = '';
    if (!silencio) {
      const sal = await motor.enc.run({ frames: new ort.Tensor('float32', ventanas(pcm, ini, fin), [3000, 400]) });
      const cruz = {};
      for (let l = 0; l < c.L; l++) { cruz['ck' + l] = sal['ck' + l]; cruz['cv' + l] = sal['cv' + l]; }
      const fijo = lengua ? codificar((FRASE_INICIAL[lengua] || '') + (vocabulario ? ' ' + vocabulario : '')).slice(0, 100) : [];
      const contexto = [...fijo, ...anterior.slice(-(MAX_CONTEXTO - fijo.length))];
      let res = await decodificar(cruz, contexto.length ? [c.sotPrev, ...contexto] : [], lengua, 0);
      lengua = res.idioma;
      // regla de Whisper para tramos sin voz
      const callado = res.pNoHabla > 0.6 && res.lpMedio < -1;
      if (!callado && (res.repetido || res.lpMedio < -1)) {
        const otro = await decodificar(cruz, [], lengua, 0.4);
        if ((res.repetido && !otro.repetido) || (otro.repetido === res.repetido && otro.lpMedio > res.lpMedio)) res = otro;
      }
      texto = callado ? '' : decodificarTexto(res.tokens);
      anterior = callado || res.repetido ? [] : res.tokens;
    }
    postMessage({ tipo: 'tramo', archivo, i, texto, idioma: lengua });
  }
}

let cola = Promise.resolve();

onmessage = (e) => {
  const m = e.data;
  if (m.tipo === 'cancelar') { cancelado = true; return; }
  cola = cola.then(async () => {
    cancelado = false;
    try {
      if (m.tipo === 'iniciar') {
        await iniciar(m);
        postMessage({ tipo: 'listo' });
      } else if (m.tipo === 'bloque') {
        await bloque(m);
        postMessage({ tipo: 'bloque-fin', archivo: m.archivo });
      }
    } catch (err) {
      if (err instanceof Cancelado) postMessage({ tipo: 'cancelado', archivo: m.archivo });
      else postMessage({ tipo: 'error', archivo: m.archivo, fase: m.tipo, mensaje: String(err?.message || err) });
    }
  });
};
