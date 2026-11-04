/* ================= Tutor: preguntas libres ================= */
ACT.askTutor = async el => {
  const key = el.dataset.key, ctx = el.dataset.ctx, ta = document.getElementById('tutor-' + key), q = ((ta && ta.value) || '').trim();
  if (!q) { toast('Escribe tu pregunta.'); return; }
  const st = TUTOR[key] = { q, a: '', busy: true, ctl: new AbortController() };
  render();
  try {
    const r = await AI.fn(`You are a patient English tutor. ${learner()}
Answer the learner's question in Spanish, clearly and briefly (at most about 150 words). Include 2-3 short English examples, preferably from pharmacy, lab or university life. If the answer depends on US vs UK English, or if usage is debated, say so. If the question is not about English, answer briefly and bring it back to English learning.
Lesson context: ${ctx}
Question: """${q.slice(0, 1500)}"""`, { signal: st.ctl.signal, onText: ({ text }) => { st.a = text; const out = document.getElementById('tutor-out-' + key); if (out) out.textContent = text; } });
    st.a = r.text;
  } catch (e) {
    st.a = (e && e.text) || '';
    if (!(e && e.code === 'cancelled')) st.a += (st.a ? '\n\n' : '') + AI.fail(e);
  }
  st.busy = false; render();
};
ACT.stopTutor = el => { const st = TUTOR[el.dataset.key]; if (st && st.ctl) st.ctl.abort(); };

/* ================= Arranque ================= */
function buildNav() {
  const link = (id, label, cls = '') => `<a href="#${id}" data-act="nav" data-navlink="${id}" class="${cls}">${ICON[id]}<span>${label}</span></a>`;
  const rail = $('#railNav');
  if (rail) rail.innerHTML = link('hoy', 'Hoy') + link('repaso', 'Repaso') + '<p class="mono rail-group">Practicar</p>' + PRACTICE.map(([id, name]) => link(id, name)).join('') + '<p class="mono rail-group">Seguimiento</p>' + link('progreso', 'Progreso') + link('ciencia', 'La ciencia');
  const tab = $('#tabBar');
  if (tab) tab.innerHTML = NAV.map(([id, label]) => link(id, label)).join('');
  $$('[data-logo]').forEach(el => { el.innerHTML = LOGO; });
}
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (fn) fn(el, ev);
});
document.addEventListener('input', ev => { const el = ev.target, k = el && el.dataset && el.dataset.input; if (k && INP[k]) INP[k](el, ev); });
document.addEventListener('change', ev => { const el = ev.target, k = el && el.dataset && el.dataset.change; if (k && CHG[k]) CHG[k](el, ev); });
document.addEventListener('keydown', ev => {
  const t = ev.target;
  if ((ev.key === 'Enter' || ev.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.dataset && t.dataset.act) { ev.preventDefault(); t.click(); }
});
addEventListener('hashchange', () => { TTS.stop(); stopTimers(); render(); window.scrollTo(0, 0); });

buildNav();
TTS.init();
render();
initCloud();
AI.init();
