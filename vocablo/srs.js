/*
 * Vocablo · motor de repetición espaciada
 *
 * Dos planificadores con la misma máquina de estados que Anki:
 *   new → learning (pasos en minutos) → review (intervalos en días)
 *   review --(Otra vez)--> relearning → review
 *
 *  - "sm2":  el algoritmo clásico de Anki (SM-2 modificado, como el
 *            planificador v3): factor de facilidad 250 %, pasos 1m 10m,
 *            intervalo de graduación 1 d, fácil 4 d, bonus fácil 1,3,
 *            intervalo difícil 1,2, nuevo intervalo tras lapso 0 %.
 *  - "fsrs": FSRS-5 (el planificador moderno que Anki trae desde 23.10)
 *            con sus pesos por defecto: modela estabilidad (S),
 *            dificultad (D) y recuperabilidad (R) de cada ficha y fija el
 *            intervalo para la retención deseada.
 *
 * Funciones puras, sin DOM: se usan en el navegador (global SRS) y en
 * Node para las pruebas (module.exports).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SRS = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  // Pesos por defecto de FSRS-5 (fsrs-rs / ts-fsrs).
  const FSRS5_WEIGHTS = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
    1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315,
    2.9898, 0.51655, 0.6621,
  ];
  const DECAY = -0.5;
  const FACTOR = 19 / 81; // con DECAY = -0.5, R(t = S) = 0,9
  const S_MIN = 0.01;

  const DEFAULTS = Object.freeze({
    algorithm: 'sm2',
    learningSteps: [1, 10], // minutos
    relearningSteps: [10], // minutos
    graduatingInterval: 1, // días
    easyInterval: 4, // días
    startingEase: 2.5,
    easyBonus: 1.3,
    hardInterval: 1.2,
    intervalModifier: 1.0,
    newInterval: 0, // fracción del intervalo que se conserva tras un lapso
    minimumInterval: 1,
    maximumInterval: 36500,
    leechThreshold: 8,
    desiredRetention: 0.9,
    fsrsWeights: FSRS5_WEIGHTS,
    dayStartHour: 4, // el "día de estudio" empieza a las 4:00, como en Anki
    fuzz: true,
  });

  function config(partial) {
    return Object.assign({}, DEFAULTS, partial || {});
  }

  // ---------------------------------------------------------------- días

  function offsetMs(ms) {
    return new Date(ms).getTimezoneOffset() * MIN;
  }

  /** Índice del día de estudio local (cambia a las `dayStartHour`). */
  function dayIndex(ms, dayStartHour = 4) {
    return Math.floor((ms - offsetMs(ms) - dayStartHour * HOUR) / DAY);
  }

  /** Instante (ms) en que empieza el día de estudio `idx`. */
  function dayStart(idx, dayStartHour = 4) {
    const approx = idx * DAY + dayStartHour * HOUR;
    return approx + offsetMs(approx + offsetMs(approx));
  }

  // --------------------------------------------------------------- fichas

  function newCard() {
    return {
      type: 'new', // new | learning | review | relearning
      due: 0, // ms; para "review" es el inicio del día en que vence
      ivl: 0, // días
      ease: 0, // factor de facilidad (SM-2)
      step: 0, // paso actual de aprendizaje
      reps: 0,
      lapses: 0,
      stability: null, // FSRS
      difficulty: null, // FSRS
      lastReview: null, // ms
    };
  }

  function clampIvl(ivl, cfg) {
    return Math.max(1, Math.min(cfg.maximumInterval, Math.round(ivl)));
  }

  /**
   * Fuzz de Anki: reparte un poco los intervalos para que las fichas
   * creadas el mismo día no venzan siempre juntas.
   */
  function fuzzRange(ivl) {
    if (ivl < 2.5) return [ivl, ivl];
    const ranges = [
      [2.5, 7, 0.15],
      [7, 20, 0.1],
      [20, Infinity, 0.05],
    ];
    let delta = 1;
    for (const [start, end, factor] of ranges) {
      delta += factor * Math.max(Math.min(ivl, end) - start, 0);
    }
    const lo = Math.max(2, Math.round(ivl - delta));
    const hi = Math.round(ivl + delta);
    return [lo, Math.max(lo, hi)];
  }

  function applyFuzz(ivl, rng) {
    if (!rng) return ivl;
    const [lo, hi] = fuzzRange(ivl);
    return Math.floor(rng() * (hi - lo + 1)) + lo;
  }

  function hardDelay(steps, step) {
    if (step === 0) {
      if (steps.length > 1) return (steps[0] + steps[1]) / 2;
      return Math.min(steps[0] * 1.5, steps[0] + 1440);
    }
    return steps[step];
  }

  function stepsFor(c, cfg) {
    return c.type === 'relearning' ? cfg.relearningSteps : cfg.learningSteps;
  }

  /** Coloca una ficha en un paso de aprendizaje de `minutes` minutos. */
  function toStep(c, step, minutes, now, today, cfg) {
    const out = Object.assign({}, c, { step });
    if (minutes >= 1440) {
      const days = Math.max(1, Math.round(minutes / 1440));
      out.due = dayStart(today + days, cfg.dayStartHour);
      return { card: out, delayMs: out.due - now };
    }
    out.due = now + Math.round(minutes * MIN);
    return { card: out, delayMs: Math.round(minutes * MIN) };
  }

  function toReview(c, ivl, today, cfg, extra) {
    const out = Object.assign({}, c, extra || {}, {
      type: 'review',
      step: 0,
      ivl,
      due: dayStart(today + ivl, cfg.dayStartHour),
    });
    return { card: out, ivlDays: ivl };
  }

  // ----------------------------------------------------------------- SM-2

  function sm2Outcomes(card, now, cfg, rng) {
    const today = dayIndex(now, cfg.dayStartHour);
    const out = {};

    if (card.type !== 'review') {
      const c =
        card.type === 'new'
          ? Object.assign({}, card, { type: 'learning', step: 0, ease: cfg.startingEase })
          : card;
      const steps = stepsFor(c, cfg);
      const step = Math.min(c.step || 0, Math.max(0, steps.length - 1));
      const graduate = (easy) => {
        let ivl;
        if (c.type === 'relearning') {
          ivl = easy ? c.ivl + 1 : c.ivl;
        } else {
          ivl = easy ? cfg.easyInterval : cfg.graduatingInterval;
        }
        ivl = clampIvl(applyFuzz(clampIvl(ivl, cfg), rng), cfg);
        return toReview(c, ivl, today, cfg);
      };
      if (!steps.length) {
        out[1] = graduate(false);
        out[2] = graduate(false);
        out[3] = graduate(false);
        out[4] = graduate(true);
      } else {
        out[1] = toStep(c, 0, steps[0], now, today, cfg);
        out[2] = toStep(c, step, hardDelay(steps, step), now, today, cfg);
        out[3] =
          step + 1 < steps.length
            ? toStep(c, step + 1, steps[step + 1], now, today, cfg)
            : graduate(false);
        out[4] = graduate(true);
        if (out[3].ivlDays && out[4].ivlDays <= out[3].ivlDays) {
          out[4] = toReview(c, Math.min(cfg.maximumInterval, out[3].ivlDays + 1), today, cfg);
        }
      }
      return out;
    }

    // Ficha en repaso.
    const c = card;
    const daysLate = Math.max(0, today - dayIndex(c.due, cfg.dayStartHour));
    const constrain = (raw, prev) => {
      let ivl = Math.round(raw * cfg.intervalModifier);
      ivl = applyFuzz(ivl, rng);
      ivl = Math.max(ivl, prev + 1, 1);
      return Math.min(ivl, cfg.maximumInterval);
    };
    const hardMin = cfg.hardInterval > 1 ? c.ivl : 0;
    const hard = constrain(c.ivl * cfg.hardInterval, hardMin);
    const good = constrain((c.ivl + Math.floor(daysLate / 2)) * c.ease, hard);
    const easy = constrain((c.ivl + daysLate) * c.ease * cfg.easyBonus, good);

    out[1] = sm2Lapse(c, now, today, cfg);
    out[2] = toReview(c, hard, today, cfg, { ease: Math.max(1.3, c.ease - 0.15) });
    out[3] = toReview(c, good, today, cfg);
    out[4] = toReview(c, easy, today, cfg, { ease: c.ease + 0.15 });
    return out;
  }

  function sm2Lapse(c, now, today, cfg) {
    const ivl = Math.min(
      cfg.maximumInterval,
      Math.max(cfg.minimumInterval, Math.round(c.ivl * cfg.newInterval), 1)
    );
    const base = Object.assign({}, c, {
      lapses: c.lapses + 1,
      ease: Math.max(1.3, c.ease - 0.2),
      ivl,
    });
    if (cfg.relearningSteps.length) {
      base.type = 'relearning';
      return toStep(base, 0, cfg.relearningSteps[0], now, today, cfg);
    }
    return toReview(base, ivl, today, cfg);
  }

  // ----------------------------------------------------------------- FSRS

  function clampD(d) {
    return Math.min(10, Math.max(1, d));
  }
  function clampS(s) {
    return Math.min(36500, Math.max(S_MIN, s));
  }
  function initS(w, r) {
    return clampS(w[r - 1]);
  }
  function initD(w, r) {
    return clampD(w[4] - Math.exp(w[5] * (r - 1)) + 1);
  }
  function nextD(w, d, r) {
    const delta = -w[6] * (r - 3);
    const damped = d + (delta * (10 - d)) / 9; // amortiguación lineal (FSRS-5)
    const reverted = w[7] * initD(w, 4) + (1 - w[7]) * damped; // reversión a la media
    return clampD(reverted);
  }

  /** Recuperabilidad: probabilidad de recordar tras `t` días con estabilidad S. */
  function retrievability(t, s) {
    return Math.pow(1 + (FACTOR * t) / s, DECAY);
  }

  function recallS(w, d, s, r, rating) {
    const hardPenalty = rating === 2 ? w[15] : 1;
    const easyBonus = rating === 4 ? w[16] : 1;
    return (
      s *
      (1 +
        Math.exp(w[8]) *
          (11 - d) *
          Math.pow(s, -w[9]) *
          (Math.exp(w[10] * (1 - r)) - 1) *
          hardPenalty *
          easyBonus)
    );
  }

  function forgetS(w, d, s, r) {
    const sf =
      w[11] *
      Math.pow(d, -w[12]) *
      (Math.pow(s + 1, w[13]) - 1) *
      Math.exp(w[14] * (1 - r));
    return Math.min(sf, s / Math.exp(w[17] * w[18]));
  }

  function shortTermS(w, s, rating) {
    return s * Math.exp(w[17] * (rating - 3 + w[18]));
  }

  /** Intervalo (días, sin fuzz) que deja la recuperabilidad en la retención deseada. */
  function fsrsInterval(s, cfg) {
    const raw = (s / FACTOR) * (Math.pow(cfg.desiredRetention, 1 / DECAY) - 1);
    return clampIvl(raw * cfg.intervalModifier, cfg);
  }

  function fsrsMemory(card, rating, now, cfg) {
    const w = cfg.fsrsWeights;
    if (card.type === 'new' || card.stability == null || card.difficulty == null) {
      return { stability: initS(w, rating), difficulty: initD(w, rating) };
    }
    const elapsed =
      card.lastReview == null
        ? 0
        : Math.max(0, dayIndex(now, cfg.dayStartHour) - dayIndex(card.lastReview, cfg.dayStartHour));
    const s = card.stability;
    const d = card.difficulty;
    let ns;
    if (elapsed === 0) {
      ns = shortTermS(w, s, rating);
    } else {
      const r = retrievability(elapsed, s);
      ns = rating === 1 ? forgetS(w, d, s, r) : recallS(w, d, s, r, rating);
    }
    return { stability: clampS(ns), difficulty: nextD(w, d, rating) };
  }

  function fsrsOutcomes(card, now, cfg, rng) {
    const today = dayIndex(now, cfg.dayStartHour);
    const out = {};
    const mem = {};
    for (const r of [1, 2, 3, 4]) mem[r] = fsrsMemory(card, r, now, cfg);
    const ivlFor = (r) => fsrsInterval(mem[r].stability, cfg);

    if (card.type !== 'review') {
      const c =
        card.type === 'new'
          ? Object.assign({}, card, { type: 'learning', step: 0, ease: cfg.startingEase })
          : card;
      const steps = stepsFor(c, cfg);
      const step = Math.min(c.step || 0, Math.max(0, steps.length - 1));
      const graduate = (r, minIvl) => {
        let ivl = ivlFor(r);
        ivl = clampIvl(applyFuzz(ivl, rng), cfg);
        if (minIvl) ivl = Math.min(cfg.maximumInterval, Math.max(ivl, minIvl));
        return toReview(Object.assign({}, c, mem[r]), ivl, today, cfg);
      };
      const learn = (r, s, minutes) =>
        toStep(Object.assign({}, c, mem[r]), s, minutes, now, today, cfg);
      if (!steps.length) {
        out[1] = graduate(1);
        out[2] = graduate(2);
        out[3] = graduate(3);
        out[4] = graduate(4, out[3].ivlDays + 1);
      } else {
        out[1] = learn(1, 0, steps[0]);
        out[2] = learn(2, step, hardDelay(steps, step));
        out[3] = step + 1 < steps.length ? learn(3, step + 1, steps[step + 1]) : graduate(3);
        out[4] = graduate(4, out[3].ivlDays ? out[3].ivlDays + 1 : 0);
      }
      return out;
    }

    const c = card;
    let hard = applyFuzz(ivlFor(2), rng);
    let good = applyFuzz(ivlFor(3), rng);
    let easy = applyFuzz(ivlFor(4), rng);
    hard = Math.min(hard, good);
    good = Math.max(good, hard + 1);
    easy = Math.max(easy, good + 1);
    hard = clampIvl(hard, cfg);
    good = clampIvl(good, cfg);
    easy = clampIvl(easy, cfg);

    // Lapso: la ficha vuelve a reaprendizaje con la estabilidad reducida.
    const lapsed = Object.assign({}, c, mem[1], {
      lapses: c.lapses + 1,
      ivl: clampIvl(Math.max(cfg.minimumInterval, ivlFor(1)), cfg),
    });
    if (cfg.relearningSteps.length) {
      lapsed.type = 'relearning';
      out[1] = toStep(lapsed, 0, cfg.relearningSteps[0], now, today, cfg);
    } else {
      out[1] = toReview(lapsed, lapsed.ivl, today, cfg);
    }
    out[2] = toReview(Object.assign({}, c, mem[2]), hard, today, cfg);
    out[3] = toReview(Object.assign({}, c, mem[3]), good, today, cfg);
    out[4] = toReview(Object.assign({}, c, mem[4]), easy, today, cfg);
    return out;
  }

  // ------------------------------------------------------------ interfaz

  function outcomes(card, now, cfg, rng) {
    const conf = config(cfg);
    return conf.algorithm === 'fsrs'
      ? fsrsOutcomes(card, now, conf, rng)
      : sm2Outcomes(card, now, conf, rng);
  }

  /**
   * Responde una ficha. rating: 1 Otra vez · 2 Difícil · 3 Bien · 4 Fácil.
   * Devuelve la ficha nueva (objeto nuevo; no muta la original) y el registro
   * de la respuesta, al estilo del revlog de Anki.
   */
  function answer(card, rating, now, cfg, rng) {
    if (![1, 2, 3, 4].includes(rating)) throw new RangeError('rating debe ser 1-4');
    const conf = config(cfg);
    const random = conf.fuzz ? rng || Math.random : null;
    const res = outcomes(card, now, conf, random)[rating];
    const next = Object.assign({}, res.card, {
      reps: (card.reps || 0) + 1,
      lastReview: now,
    });
    const leech =
      next.lapses > card.lapses &&
      conf.leechThreshold > 0 &&
      next.lapses >= conf.leechThreshold &&
      (next.lapses - conf.leechThreshold) % Math.max(1, Math.ceil(conf.leechThreshold / 2)) === 0;
    const log = {
      rating,
      type: card.type,
      ivl: res.ivlDays != null ? res.ivlDays : -Math.round(res.delayMs / 1000),
      lastIvl: card.ivl || 0,
      ease: next.ease,
      stability: next.stability,
      difficulty: next.difficulty,
    };
    return { card: next, log, leech };
  }

  /** Intervalos que mostrará cada botón (sin fuzz), en ms desde ahora. */
  function preview(card, now, cfg) {
    const conf = config(cfg);
    const all = outcomes(card, now, conf, null);
    const res = {};
    for (const r of [1, 2, 3, 4]) {
      const o = all[r];
      res[r] = o.ivlDays != null ? o.ivlDays * DAY : o.delayMs;
    }
    return res;
  }

  /** Formato corto de un intervalo, como en los botones de Anki. */
  function formatInterval(ms) {
    const s = ms / 1000;
    if (s < 60) return '<1 min';
    const m = s / 60;
    if (m < 59.5) return Math.round(m) + ' min';
    const h = m / 60;
    if (h < 23.5) return Math.round(h) + ' h';
    const d = h / 24;
    if (d < 29.5) return Math.round(d) + ' d';
    const short = (x) => x.toFixed(1).replace(/\.0$/, '').replace('.', ',');
    if (d < 365) {
      const mo = short(d / 30);
      return mo + (mo === '1' ? ' mes' : ' meses');
    }
    const y = short(d / 365);
    return y + (y === '1' ? ' año' : ' años');
  }

  /** Recuperabilidad actual estimada (0-1) de una ficha en repaso. */
  function currentRetrievability(card, now, cfg) {
    const conf = config(cfg);
    if (card.type === 'new' || !card.lastReview) return null;
    const t = Math.max(0, (now - card.lastReview) / DAY);
    if (card.stability != null) return retrievability(t, card.stability);
    if (!card.ivl) return null;
    // Estimación para SM-2: suponemos R = 0,9 al vencer el intervalo.
    return retrievability(t, card.ivl);
  }

  return {
    DEFAULTS,
    FSRS5_WEIGHTS,
    DAY,
    MIN,
    config,
    dayIndex,
    dayStart,
    newCard,
    answer,
    preview,
    outcomes,
    formatInterval,
    fuzzRange,
    retrievability,
    currentRetrievability,
    fsrsInterval,
  };
});
