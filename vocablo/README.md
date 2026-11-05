# Vocablo · fichas de vocabulario en inglés

App de fichas al estilo Anki para aprender vocabulario en inglés: **tú creas
las fichas** y la app decide cuándo repasar cada una con **el mismo sistema de
repetición espaciada de Anki** (SM-2, como su planificador v3) o, si lo
prefieres, con **FSRS-5**, el planificador moderno que Anki incluye desde la
versión 23.10.

## Cómo usarla

- **En claude.ai (recomendado):** abre el artefacto publicado. Tus fichas se
  guardan en tu cuenta de Claude, son privadas y te siguen al móvil y al
  ordenador. El botón «Autocompletar con Claude» rellena la ficha por ti.
- **En local:** sirve la carpeta con cualquier servidor estático y abre
  `index.html`:

  ```bash
  cd vocablo
  python3 -m http.server 8080
  # abre http://127.0.0.1:8080/
  ```

  Los datos se guardan en el navegador (IndexedDB). Fuera de claude.ai el
  autocompletado usa un diccionario libre (dictionaryapi.dev + MyMemory) y la
  app se puede instalar en el móvil («Añadir a pantalla de inicio») y funciona
  sin conexión. Si activas GitHub Pages en el repositorio, la URL
  `…/vocablo/` sirve tal cual.

## El sistema de memorización

Igual que Anki, cada ficha pasa por estos estados:

```
nueva ──► aprendiendo (pasos de 1 min y 10 min) ──► repaso (días)
                                    ▲                    │ «Otra vez»
                                    └── reaprendiendo ◄──┘ (paso de 10 min)
```

| Botón | SM-2 en una ficha de repaso (intervalo I, facilidad F) |
|---|---|
| Otra vez | lapso: F − 20 %, vuelve a 1 día tras reaprender |
| Difícil | I × 1,2 · F − 15 % |
| Bien | (I + retraso/2) × F |
| Fácil | (I + retraso) × F × 1,3 · F + 15 % |

Valores por defecto de Anki: facilidad inicial 250 %, graduación 1 día,
intervalo fácil 4 días, 20 nuevas y 200 repasos por mazo y día, el día empieza
a las 4:00, «fuzz» en los intervalos y marca de palabra difícil (leech) a los 8
fallos. Todo es configurable en **Ajustes → Opciones avanzadas**.

Con **FSRS-5** cada ficha guarda su estabilidad (S), dificultad (D) y fecha de
último repaso; la recuperabilidad R = (1 + 19/81 · t/S)^−0,5 y el intervalo es
el que hace que R caiga a tu retención deseada (90 % por defecto). Se usan los
pesos por defecto de FSRS-5 (sin optimizar con tu historial).

## Qué añade frente a Anki

- **Cuatro tipos de ficha por palabra:** Inglés → Español, Español → Inglés
  (con opción de escribir la respuesta y corrección letra a letra), Escucha
  (voz sintética) y Completar la frase (tu ejemplo con un hueco).
- **Autocompletar con Claude:** traducción, IPA, categoría, definición,
  ejemplo y su traducción, sinónimos, nivel MCER y una mnemotecnia en
  español. También **añadir varias palabras a la vez** desde una lista.
- **Pronunciación** con voz estadounidense, británica, australiana… y
  práctica con micrófono (fuera de claude.ai, en navegadores compatibles).
- **Fichas hermanas separadas:** EN→ES y ES→EN de la misma palabra no salen el
  mismo día, para que una no te chive la otra.
- **Pistas** progresivas, **deshacer** ilimitado en la sesión, **práctica libre**
  sin tocar tus intervalos y repaso de las falladas al terminar.
- **Progreso:** racha, meta diaria, mapa de actividad de un año, previsión de
  repasos a 30 días, estado de las fichas, distribución de respuestas,
  retención real y palabras que más se te resisten.
- **Imágenes** (elegir, arrastrar o pegar), etiquetas, detección de duplicados,
  modo claro/oscuro y atajos de teclado.
- **Tus datos son tuyos:** copia de seguridad JSON, exportación compatible con
  Anki (Archivo → Importar, tipo «Básico (y tarjeta invertida)») e importación
  de CSV/TSV, incluida la exportación en texto plano de Anki.

## Archivos

| Archivo | Qué hace |
|---|---|
| `srs.js` | Planificadores SM-2 y FSRS-5 (funciones puras, probadas en Node) |
| `storage.js` | Guardado en la base de datos de claude.ai o en IndexedDB |
| `ai.js` | Autocompletar (Claude o diccionario libre) |
| `js/*.js` | Interfaz: inicio, estudio, editor, explorar, progreso, ajustes |
| `styles.css` | Diseño (ficha de cartulina, tema claro y oscuro) |
| `build-artifact.js` | Une todo en `build/vocablo-artifact.html` para publicarlo en claude.ai |
| `tests/srs.test.js` | Pruebas del planificador |

```bash
node --test vocablo/tests/*.test.js # pruebas del planificador
node vocablo/build-artifact.js      # genera la versión de un solo archivo
```

Vocablo no es un producto de Anki ni está afiliado a él; solo reproduce su
algoritmo, que es público.
