// Pruebas del motor de repetición espaciada.
// Ejecutar con:  node --test vocablo/tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const SRS = require('../srs.js');

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
// Mediodía local de un día cualquiera: lejos del cambio de día de las 4:00.
const T0 = new Date(2026, 2, 10, 12, 0, 0).getTime();
const noFuzz = { fuzz: false };

function run(card, ratings, start, cfg, gapFn) {
  let now = start;
  let c = card;
  const logs = [];
  for (const r of ratings) {
    const res = SRS.answer(c, r, now, cfg);
    c = res.card;
    logs.push(res.log);
    now = gapFn ? gapFn(c, now) : Math.max(now + MIN, c.due);
  }
  return { card: c, logs, now };
}

test('día de estudio: cambia a las 4:00 locales', () => {
  const late = new Date(2026, 2, 10, 23, 30).getTime();
  const earlyNext = new Date(2026, 2, 11, 3, 59).getTime();
  const afterFour = new Date(2026, 2, 11, 4, 1).getTime();
  assert.equal(SRS.dayIndex(late), SRS.dayIndex(earlyNext));
  assert.equal(SRS.dayIndex(afterFour), SRS.dayIndex(late) + 1);
  const idx = SRS.dayIndex(T0);
  assert.equal(new Date(SRS.dayStart(idx)).getHours(), 4);
  assert.equal(SRS.dayIndex(SRS.dayStart(idx)), idx);
  assert.equal(SRS.dayIndex(SRS.dayStart(idx) - 1), idx - 1);
});

test('SM-2: ficha nueva con pasos 1m 10m como en Anki', () => {
  const c = SRS.newCard();
  const p = SRS.preview(c, T0, noFuzz);
  assert.equal(p[1], 1 * MIN); // Otra vez: 1 min
  assert.equal(p[2], 5.5 * MIN); // Difícil: media de 1 y 10
  assert.equal(p[3], 10 * MIN); // Bien: siguiente paso
  assert.equal(p[4], 4 * DAY); // Fácil: intervalo fácil
  assert.equal(SRS.formatInterval(p[1]), '1 min');
  assert.equal(SRS.formatInterval(p[2]), '6 min');
  assert.equal(SRS.formatInterval(p[4]), '4 d');
});

test('SM-2: Bien, Bien gradúa a 1 día; luego 3 d (×2,5) y crece', () => {
  let c = SRS.newCard();
  let res = SRS.answer(c, 3, T0, noFuzz);
  assert.equal(res.card.type, 'learning');
  assert.equal(res.card.step, 1);
  assert.equal(res.card.ease, 2.5);
  res = SRS.answer(res.card, 3, T0 + 10 * MIN, noFuzz);
  assert.equal(res.card.type, 'review');
  assert.equal(res.card.ivl, 1);
  assert.equal(SRS.dayIndex(res.card.due), SRS.dayIndex(T0) + 1);
  // Al día siguiente, Bien: 1 × 2,5 = 2,5 → 3 (redondeo), y al menos ivl+1
  const next = SRS.dayStart(SRS.dayIndex(T0) + 1) + 8 * 60 * MIN;
  const p = SRS.preview(res.card, next, noFuzz);
  assert.equal(p[2] / DAY, 2); // Difícil: 1 × 1,2 → 1, pero mínimo ivl + 1
  assert.equal(p[3] / DAY, 3);
  assert.equal(p[4] / DAY, 4); // 1 × 2,5 × 1,3 = 3,25 → 3, pero > Bien
  res = SRS.answer(res.card, 3, next, noFuzz);
  assert.equal(res.card.ivl, 3);
  assert.equal(res.log.type, 'review');
  assert.equal(res.log.lastIvl, 1);
});

test('SM-2: los botones de repaso respetan Difícil < Bien < Fácil y la facilidad', () => {
  const card = Object.assign(SRS.newCard(), {
    type: 'review',
    ivl: 10,
    ease: 2.5,
    reps: 5,
    due: SRS.dayStart(SRS.dayIndex(T0)),
  });
  const p = SRS.preview(card, T0, noFuzz);
  assert.equal(p[2] / DAY, 12); // 10 × 1,2
  assert.equal(p[3] / DAY, 25); // 10 × 2,5
  assert.equal(p[4] / DAY, 33); // 10 × 2,5 × 1,3 = 32,5 → 33
  assert.equal(SRS.answer(card, 2, T0, noFuzz).card.ease, 2.35);
  assert.equal(SRS.answer(card, 3, T0, noFuzz).card.ease, 2.5);
  assert.equal(SRS.answer(card, 4, T0, noFuzz).card.ease, 2.65);
});

test('SM-2: los días de retraso cuentan (como en Anki)', () => {
  const due = SRS.dayStart(SRS.dayIndex(T0) - 4); // venció hace 4 días
  const card = Object.assign(SRS.newCard(), { type: 'review', ivl: 10, ease: 2.5, due });
  const p = SRS.preview(card, T0, noFuzz);
  assert.equal(p[3] / DAY, 30); // (10 + 4/2) × 2,5
  assert.equal(p[4] / DAY, 46); // (10 + 4) × 2,5 × 1,3 = 45,5 → 46
});

test('SM-2: lapso → reaprendizaje 10 min, facilidad −20 %, intervalo mínimo', () => {
  const card = Object.assign(SRS.newCard(), {
    type: 'review',
    ivl: 20,
    ease: 2.5,
    lapses: 0,
    due: SRS.dayStart(SRS.dayIndex(T0)),
  });
  const res = SRS.answer(card, 1, T0, noFuzz);
  assert.equal(res.card.type, 'relearning');
  assert.equal(res.card.lapses, 1);
  assert.equal(res.card.ease, 2.3);
  assert.equal(res.card.ivl, 1);
  assert.equal(res.card.due, T0 + 10 * MIN);
  // Bien en reaprendizaje: vuelve a repaso con el intervalo reducido
  const back = SRS.answer(res.card, 3, T0 + 10 * MIN, noFuzz);
  assert.equal(back.card.type, 'review');
  assert.equal(back.card.ivl, 1);
  // Otra vez dentro del reaprendizaje no cuenta como otro lapso
  const again = SRS.answer(res.card, 1, T0 + 10 * MIN, noFuzz);
  assert.equal(again.card.lapses, 1);
});

test('SM-2: la facilidad nunca baja de 130 %', () => {
  let card = Object.assign(SRS.newCard(), { type: 'review', ivl: 3, ease: 1.35, due: T0 });
  card = SRS.answer(card, 1, T0, noFuzz).card;
  assert.equal(card.ease, 1.3);
});

test('detección de sanguijuelas (leech) en el umbral 8 y cada 4 lapsos después', () => {
  const mk = (lapses) =>
    Object.assign(SRS.newCard(), { type: 'review', ivl: 5, ease: 2, lapses, due: T0 });
  assert.equal(SRS.answer(mk(6), 1, T0, noFuzz).leech, false);
  assert.equal(SRS.answer(mk(7), 1, T0, noFuzz).leech, true);
  assert.equal(SRS.answer(mk(8), 1, T0, noFuzz).leech, false);
  assert.equal(SRS.answer(mk(11), 1, T0, noFuzz).leech, true);
});

test('fuzz: rango de Anki y nunca rompe el orden de los botones', () => {
  assert.deepEqual(SRS.fuzzRange(1), [1, 1]);
  assert.deepEqual(SRS.fuzzRange(10), [8, 12]);
  const card = Object.assign(SRS.newCard(), { type: 'review', ivl: 40, ease: 2.5, due: T0 });
  for (let i = 0; i < 200; i++) {
    const ivls = [2, 3, 4].map((r) => SRS.answer(card, r, T0, { fuzz: true }).card.ivl);
    assert.ok(ivls[0] < ivls[1] && ivls[1] < ivls[2], 'orden ' + ivls.join(' '));
    // 40 × 2,5 = 100 d; el fuzz de Anki a 100 d es 1 + 0,675 + 1,3 + 4 ≈ ±7 d
    assert.ok(ivls[1] >= 93 && ivls[1] <= 107, 'Bien con fuzz: ' + ivls[1]);
  }
});

test('FSRS-5: estado inicial con los pesos por defecto', () => {
  const cfg = { algorithm: 'fsrs', fuzz: false };
  const res = SRS.answer(SRS.newCard(), 3, T0, cfg);
  assert.equal(res.card.type, 'learning');
  assert.ok(Math.abs(res.card.stability - 3.173) < 1e-9);
  // D0(3) = w4 − e^(2·w5) + 1
  const w = SRS.FSRS5_WEIGHTS;
  assert.ok(Math.abs(res.card.difficulty - (w[4] - Math.exp(2 * w[5]) + 1)) < 1e-9);
  // Fácil gradúa con intervalo = estabilidad (retención 0,9)
  const easy = SRS.answer(SRS.newCard(), 4, T0, cfg);
  assert.equal(easy.card.type, 'review');
  assert.equal(easy.card.ivl, Math.round(w[3]));
});

test('FSRS-5: R = 0,9 cuando t = S, e intervalos crecientes al acertar', () => {
  assert.ok(Math.abs(SRS.retrievability(10, 10) - 0.9) < 1e-12);
  const cfg = { algorithm: 'fsrs', fuzz: false };
  let c = SRS.newCard();
  let now = T0;
  c = SRS.answer(c, 3, now, cfg).card; // paso 1
  now += 10 * MIN;
  c = SRS.answer(c, 3, now, cfg).card; // gradúa
  assert.equal(c.type, 'review');
  const ivls = [c.ivl];
  for (let i = 0; i < 5; i++) {
    now = c.due + 9 * 60 * MIN;
    c = SRS.answer(c, 3, now, cfg).card;
    ivls.push(c.ivl);
  }
  for (let i = 1; i < ivls.length; i++) assert.ok(ivls[i] > ivls[i - 1], ivls.join(' '));
  const p = SRS.preview(c, c.due + 9 * 60 * MIN, cfg);
  assert.ok(p[2] < p[3] && p[3] < p[4]);
  // Un lapso reduce la estabilidad y manda a reaprendizaje
  const lapse = SRS.answer(c, 1, c.due + 9 * 60 * MIN, cfg);
  assert.equal(lapse.card.type, 'relearning');
  assert.ok(lapse.card.stability < c.stability);
  assert.ok(lapse.card.difficulty > c.difficulty);
});

test('FSRS-5: mayor retención deseada → intervalos más cortos', () => {
  const s = 20;
  const i90 = SRS.fsrsInterval(s, SRS.config({ desiredRetention: 0.9 }));
  const i95 = SRS.fsrsInterval(s, SRS.config({ desiredRetention: 0.95 }));
  const i80 = SRS.fsrsInterval(s, SRS.config({ desiredRetention: 0.8 }));
  assert.equal(i90, 20);
  assert.ok(i95 < i90 && i90 < i80);
});

test('simulación larga: siempre estados válidos', () => {
  for (const algorithm of ['sm2', 'fsrs']) {
    let c = SRS.newCard();
    let now = T0;
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 300; i++) {
      const rating = 1 + Math.floor(rng() * 4);
      const res = SRS.answer(c, rating, now, { algorithm }, rng);
      c = res.card;
      assert.ok(['learning', 'review', 'relearning'].includes(c.type));
      assert.ok(Number.isFinite(c.due) && c.due > now - 1);
      if (c.type === 'review') assert.ok(c.ivl >= 1 && c.ivl <= 36500);
      if (algorithm === 'fsrs') {
        assert.ok(c.difficulty >= 1 && c.difficulty <= 10);
        assert.ok(c.stability > 0);
      } else {
        assert.ok(c.ease >= 1.3);
      }
      now = c.due + 1000;
    }
  }
});

test('formato de intervalos', () => {
  assert.equal(SRS.formatInterval(30 * 1000), '<1 min');
  assert.equal(SRS.formatInterval(10 * MIN), '10 min');
  assert.equal(SRS.formatInterval(3 * 60 * MIN), '3 h');
  assert.equal(SRS.formatInterval(1 * DAY), '1 d');
  assert.equal(SRS.formatInterval(45 * DAY), '1,5 meses');
  assert.equal(SRS.formatInterval(30 * DAY), '1 mes');
  assert.equal(SRS.formatInterval(400 * DAY), '1,1 años');
});
