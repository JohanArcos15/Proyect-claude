// Casos clínicos interactivos.
import { CASOS } from '../datos/casos.js';
import { CAT_POR_ID } from '../datos/categorias.js';
import { POR_ID } from '../datos/farmacos.js';

const CLAVE = 'neurofarma-casos';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { return {}; } };
const guardar = (o) => { try { localStorage.setItem(CLAVE, JSON.stringify(o)); } catch { /* sin almacenamiento */ } };

export function abrirCasos(raiz, id, ctx) {
  const caso = CASOS.find((c) => c.id === id);
  if (!caso) return lista(raiz, ctx);
  return vistaCaso(raiz, caso, ctx);
}

function lista(raiz, ctx) {
  const hechos = leer();
  raiz.innerHTML = `<div class="marco">
    <div class="cabeza-herr"><div><h1>Casos clínicos</h1><p class="bajada">Resuelve cada caso paso a paso y luego explóralo en el cerebro 3D. Los tres primeros siguen los casos del Parcial 2.</p></div><button class="boton" data-cerrar>✕ Cerrar</button></div>
    <div class="tarjetas">${CASOS.map((c) => {
      const cat = CAT_POR_ID[c.cat];
      return `<a class="tarjeta" href="#/casos/${c.id}" style="text-decoration:none"><div class="cat" style="color:${cat.color}">${cat.nombre}</div><h3>${c.titulo}</h3><p>${c.resumen}</p>${hechos[c.id] ? `<div class="estado-caso">✓ Resuelto · ${hechos[c.id]}</div>` : ''}</a>`;
    }).join('')}</div></div>`;
  raiz.querySelector('[data-cerrar]').addEventListener('click', ctx.cerrar);
  raiz.scrollTop = 0;
}

function vistaCaso(raiz, caso, ctx) {
  const cat = CAT_POR_ID[caso.cat];
  const respuestas = [];
  let aciertos = 0;
  raiz.innerHTML = `<div class="marco"><div class="caso-caja">
    <div class="cabeza-herr"><a class="boton fantasma" href="#/casos">← Todos los casos</a><button class="boton" data-cerrar>✕ Cerrar</button></div>
    <div class="cat" style="color:${cat.color};font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px;margin-top:14px">${cat.nombre}</div>
    <h1>${caso.titulo}</h1>
    <div class="pregunta"><p style="font-size:16px;margin:0">${caso.presentacion}</p>
      ${caso.signos ? `<div class="signos">${caso.signos.map(([n, v]) => `<span>${n}<b>${v}</b></span>`).join('')}</div>` : ''}
    </div>
    <div data-pasos></div>
  </div></div>`;
  raiz.querySelector('[data-cerrar]').addEventListener('click', ctx.cerrar);
  const contPasos = raiz.querySelector('[data-pasos]');

  const mostrarPaso = (i) => {
    if (i >= caso.pasos.length) return final();
    const p = caso.pasos[i];
    const div = document.createElement('div');
    div.className = 'pregunta';
    div.style.marginTop = '14px';
    div.innerHTML = `<div class="meta"><span>Pregunta ${i + 1} de ${caso.pasos.length}</span><span>${p.tipo === 'multiple' ? 'Marca todas las correctas' : 'Una respuesta'}</span></div>
      <h2>${p.pregunta}</h2>
      <div class="opciones">${p.opciones.map((o, k) => `<button class="opcion" data-k="${k}"><span class="letra">${String.fromCharCode(97 + k)}</span><span>${o.t}</span></button>`).join('')}</div>
      ${p.tipo === 'multiple' ? '<div style="margin-top:12px"><button class="boton primario" data-comprobar>Comprobar</button></div>' : ''}
      <div data-retro></div>`;
    contPasos.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const botones = [...div.querySelectorAll('.opcion')];
    const marcadas = new Set();
    const cerrarPaso = (bien, html) => {
      botones.forEach((b) => b.setAttribute('disabled', ''));
      div.querySelector('[data-comprobar]')?.remove();
      if (bien) aciertos++;
      respuestas.push(bien);
      div.querySelector('[data-retro]').innerHTML = `<div class="retro ${bien ? 'bien' : 'mal'}">${html}</div><div style="margin-top:10px"><button class="boton primario" data-sig>${i === caso.pasos.length - 1 ? 'Ver cierre del caso' : 'Siguiente pregunta →'}</button></div>`;
      div.querySelector('[data-sig]').addEventListener('click', (e) => { e.target.remove(); mostrarPaso(i + 1); });
    };
    div.addEventListener('click', (e) => {
      const b = e.target.closest('.opcion');
      if (b && !b.hasAttribute('disabled')) {
        const k = +b.dataset.k;
        if (p.tipo === 'multiple') {
          if (marcadas.has(k)) marcadas.delete(k); else marcadas.add(k);
          b.classList.toggle('marcada', marcadas.has(k));
          return;
        }
        const o = p.opciones[k];
        b.classList.add(o.ok ? 'correcta' : 'incorrecta');
        if (!o.ok) botones[p.opciones.findIndex((x) => x.ok)].classList.add('correcta');
        cerrarPaso(!!o.ok, `${o.ok ? '✓ ' : '✕ '}${o.fb || ''}`);
      }
      if (e.target.closest('[data-comprobar]')) {
        let bien = true;
        p.opciones.forEach((o, k) => {
          const m = marcadas.has(k);
          if (o.ok) botones[k].classList.add('correcta');
          else if (m) botones[k].classList.add('incorrecta');
          if (!!o.ok !== m) bien = false;
        });
        cerrarPaso(bien, `${bien ? '✓ ¡Todas correctas!' : '✕ Revisa las marcadas en verde (correctas) y rojo (incorrectas).'} ${p.explicacion || ''}`);
      }
    });
  };

  const final = () => {
    const div = document.createElement('div');
    div.className = 'pregunta';
    div.style.marginTop = '14px';
    const f = POR_ID[caso.farmaco];
    div.innerHTML = `<h2>Cierre del caso</h2><p style="font-size:15.5px">${caso.cierre}</p>
      <p class="nota">Resultado: ${aciertos} de ${caso.pasos.length} correctas.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="boton primario" data-explorar>Ver ${f.nombre.split(' (')[0]} en 3D →</button><a class="boton" href="#/casos">Otro caso</a></div>`;
    contPasos.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const hechos = leer();
    hechos[caso.id] = `${aciertos}/${caso.pasos.length}`;
    guardar(hechos);
    div.querySelector('[data-explorar]').addEventListener('click', () => ctx.irA(caso.cat, caso.farmaco, { aplicar: true, ...(caso.opciones || {}) }));
  };

  mostrarPaso(0);
  raiz.scrollTop = 0;
}
