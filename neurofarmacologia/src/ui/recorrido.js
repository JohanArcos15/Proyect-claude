// Recorrido guiado: tarjeta sobre el cerebro con los pasos de la categoría.
export class Recorrido {
  constructor(raiz, { alPaso, alCerrar }) {
    this.raiz = raiz;
    this.alPaso = alPaso;
    this.alCerrar = alCerrar;
    this.cat = null;
    this.i = 0;
    this.vistos = new Set();
    raiz.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.rec === 'sig') this.ir(this.i + 1);
      else if (b.dataset.rec === 'ant') this.ir(this.i - 1);
      else if (b.dataset.rec === 'cerrar') this.cerrar();
      else if (b.dataset.punto !== undefined) this.ir(+b.dataset.punto);
    });
    document.addEventListener('keydown', (e) => {
      if (!this.activo || e.target.closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight') this.ir(this.i + 1);
      if (e.key === 'ArrowLeft') this.ir(this.i - 1);
      if (e.key === 'Escape') this.cerrar();
    });
  }

  get activo() { return !!this.cat && !this.raiz.classList.contains('oculto'); }

  iniciar(cat, i = 0) {
    this.cat = cat;
    this.vistos = new Set();
    this.raiz.classList.remove('oculto');
    this.ir(i);
  }

  ir(i) {
    const pasos = this.cat?.recorrido || [];
    if (i >= pasos.length) { this.cerrar(true); return; }
    if (i < 0) return;
    this.i = i;
    this.vistos.add(i);
    const p = pasos[i];
    const ultimo = i === pasos.length - 1;
    this.raiz.innerHTML = `
      <div class="cabeza"><span class="paso">Paso ${i + 1} de ${pasos.length} · ${this.cat.nombre}</span><button class="cerrar" data-rec="cerrar" aria-label="Cerrar recorrido">×</button></div>
      <h2>${p.titulo}</h2>
      <div class="texto">${p.texto}</div>
      <div class="pie">
        <div class="puntos">${pasos.map((_, k) => `<button class="${k === i ? 'activo' : this.vistos.has(k) ? 'visto' : ''}" data-punto="${k}" aria-label="Ir al paso ${k + 1}"></button>`).join('')}</div>
        <div style="display:flex;gap:6px">
          <button class="boton mini fantasma" data-rec="ant" ${i === 0 ? 'disabled' : ''}>← Anterior</button>
          <button class="boton mini primario" data-rec="sig">${ultimo ? 'Terminar ✓' : 'Siguiente →'}</button>
        </div>
      </div>`;
    this.alPaso(p, i);
  }

  cerrar(terminado = false) {
    this.raiz.classList.add('oculto');
    const c = this.cat;
    this.cat = null;
    this.alCerrar?.(c, terminado);
  }
}
