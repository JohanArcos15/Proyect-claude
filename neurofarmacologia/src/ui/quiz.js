// Quiz de autoevaluación (estilo parcial).
import { PREGUNTAS } from '../datos/quiz.js';
import { CATEGORIAS, CAT_POR_ID } from '../datos/categorias.js';
import { POR_ID } from '../datos/farmacos.js';

const mezclar = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

export function abrirQuiz(raiz, catId, ctx) {
  if (!catId) return inicio(raiz, ctx);
  const banco = catId === 'parcial' ? mezclar(PREGUNTAS).slice(0, 12) : catId === 'todas' ? mezclar(PREGUNTAS) : mezclar(PREGUNTAS.filter((p) => p.cat === catId));
  if (!banco.length) return inicio(raiz, ctx);
  return jugar(raiz, banco, catId, ctx);
}

function inicio(raiz, ctx) {
  const cuenta = (id) => PREGUNTAS.filter((p) => p.cat === id).length;
  raiz.innerHTML = `<div class="marco">
    <div class="cabeza-herr"><div><h1>Autoevaluación</h1><p class="bajada">Preguntas de selección múltiple, verdadero/falso y completar, con el estilo del Parcial 2. Cada respuesta trae su explicación y un enlace para verlo en 3D.</p></div><button class="boton" data-cerrar>✕ Cerrar</button></div>
    <div class="tarjetas">
      <a class="tarjeta" href="#/quiz/parcial" style="text-decoration:none;border-color:color-mix(in srgb, var(--farmaco) 40%, var(--linea))"><div class="cat" style="color:var(--farmaco)">Simulacro</div><h3>Modo parcial</h3><p>12 preguntas mezcladas de todos los temas.</p></a>
      <a class="tarjeta" href="#/quiz/todas" style="text-decoration:none"><div class="cat" style="color:var(--suave)">Todo</div><h3>Todas las preguntas</h3><p>${PREGUNTAS.length} preguntas en orden aleatorio.</p></a>
      ${CATEGORIAS.filter((c) => cuenta(c.id)).map((c) => `<a class="tarjeta" href="#/quiz/${c.id}" style="text-decoration:none"><div class="cat" style="color:${c.color}">${c.nombre}</div><h3>${c.nombre}</h3><p>${cuenta(c.id)} preguntas</p></a>`).join('')}
    </div></div>`;
  raiz.querySelector('[data-cerrar]').addEventListener('click', ctx.cerrar);
  raiz.scrollTop = 0;
}

function jugar(raiz, banco, catId, ctx) {
  let i = 0, aciertos = 0;
  const fallos = [];
  const titulo = catId === 'parcial' ? 'Modo parcial' : catId === 'todas' ? 'Todas las preguntas' : CAT_POR_ID[catId]?.nombre;
  const pintar = () => {
    if (i >= banco.length) return resumen();
    const p = banco[i];
    const cat = CAT_POR_ID[p.cat];
    const opciones = p.tipo === 'vf' ? ['Verdadero', 'Falso'] : p.opciones;
    const correcta = p.tipo === 'vf' ? (p.correcta ? 0 : 1) : p.correcta;
    raiz.innerHTML = `<div class="marco"><div class="quiz-caja">
      <div class="cabeza-herr"><a class="boton fantasma" href="#/quiz">← Temas</a><button class="boton" data-cerrar>✕ Cerrar</button></div>
      <div class="marcador" style="margin-top:12px"><b style="font-family:var(--t-titulo);font-size:20px">${titulo}</b><span class="etiqueta">${aciertos} correctas</span></div>
      <div class="progreso"><i style="width:${(i / banco.length) * 100}%"></i></div>
      <div class="pregunta">
        <div class="meta"><span style="color:${cat.color};font-weight:700">${cat.nombre}</span><span>${i + 1} / ${banco.length} · ${p.tipo === 'vf' ? 'Verdadero o falso' : p.tipo === 'completar' ? 'Completar' : 'Selección múltiple'}</span></div>
        <h2>${p.tipo === 'completar' ? p.pregunta.replace('____', '<span style="border-bottom:2px solid var(--farmaco);padding:0 28px"></span>') : p.pregunta}</h2>
        <div class="opciones">${opciones.map((o, k) => `<button class="opcion" data-k="${k}"><span class="letra">${String.fromCharCode(97 + k)}</span><span>${o}</span></button>`).join('')}</div>
        <div data-retro></div>
      </div></div></div>`;
    raiz.querySelector('[data-cerrar]').addEventListener('click', ctx.cerrar);
    raiz.querySelector('.opciones').addEventListener('click', (e) => {
      const b = e.target.closest('.opcion');
      if (!b || b.hasAttribute('disabled')) return;
      const k = +b.dataset.k;
      const bien = k === correcta;
      if (bien) aciertos++; else fallos.push(p);
      const et = raiz.querySelector('.marcador .etiqueta');
      if (et) et.textContent = `${aciertos} correctas`;
      const botones = [...raiz.querySelectorAll('.opcion')];
      botones.forEach((x) => x.setAttribute('disabled', ''));
      b.classList.add(bien ? 'correcta' : 'incorrecta');
      botones[correcta].classList.add('correcta');
      const f = p.farmaco && POR_ID[p.farmaco];
      raiz.querySelector('[data-retro]').innerHTML = `<div class="retro ${bien ? 'bien' : 'mal'}"><b>${bien ? '✓ Correcto.' : `✕ La respuesta es: ${opciones[correcta]}.`}</b> ${p.explicacion}</div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="boton primario" data-sig>${i === banco.length - 1 ? 'Ver resultado' : 'Siguiente →'}</button>${f ? `<button class="boton" data-ver>Ver ${f.nombre.split(' (')[0]} en 3D</button>` : ''}</div>`;
      raiz.querySelector('[data-sig]').addEventListener('click', () => { i++; pintar(); });
      raiz.querySelector('[data-ver]')?.addEventListener('click', () => ctx.irA(p.cat === 'fundamentos' ? f.cat[0] : (f.cat.includes(p.cat) ? p.cat : f.cat[0]), f.id, { aplicar: true }));
    });
    raiz.scrollTop = 0;
  };
  const resumen = () => {
    const pct = Math.round((aciertos / banco.length) * 100);
    const nota = (aciertos / banco.length) * 5;
    raiz.innerHTML = `<div class="marco"><div class="quiz-caja">
      <div class="cabeza-herr"><a class="boton fantasma" href="#/quiz">← Temas</a><button class="boton" data-cerrar>✕ Cerrar</button></div>
      <div class="pregunta" style="margin-top:14px;text-align:center">
        <div class="meta" style="justify-content:center">${titulo}</div>
        <div style="font-family:var(--t-titulo);font-size:56px;font-weight:800;color:${pct >= 60 ? 'var(--ok)' : 'var(--alerta)'}">${aciertos}/${banco.length}</div>
        <p>${pct} % · equivale a <b class="mono">${nota.toFixed(1)}</b> sobre 5,0</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><a class="boton primario" href="#/quiz/${catId}" data-repetir>Repetir</a><a class="boton" href="#/quiz">Otro tema</a></div>
      </div>
      ${fallos.length ? `<h2 style="font-family:var(--t-titulo);margin:22px 0 10px">Para repasar</h2>${fallos.map((p) => `<div class="caja"><b>${p.pregunta.replace('____', '___')}</b><p class="nota" style="margin:6px 0 0">${p.explicacion}</p></div>`).join('')}` : '<p style="text-align:center;margin-top:16px">¡Sin errores!</p>'}
    </div></div>`;
    raiz.querySelector('[data-cerrar]').addEventListener('click', ctx.cerrar);
    raiz.querySelector('[data-repetir]').addEventListener('click', (e) => { e.preventDefault(); abrirQuiz(raiz, catId, ctx); });
    raiz.scrollTop = 0;
  };
  pintar();
}
