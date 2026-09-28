# Opioides · clase animada

Animación rigurosa e interactiva construida a partir de un audio de 64 segundos
sobre opioides, más un vídeo listo para YouTube.

| Entregable | Dónde |
|---|---|
| **Vídeo 3D para YouTube** (1080p, 2:47, renders Blender Cycles) | `salida/opioides-3d-youtube-1080p.mp4` |
| Miniatura 3D 1280×720 | `salida/miniatura-3d-youtube.jpg` |
| Título, descripción con capítulos y etiquetas (3D) | `salida/youtube-descripcion-3d.md` |
| Vídeo 2D (primera versión, ilustración vectorial) | `salida/opioides-youtube-1080p.mp4` |
| Subtítulos en español (válidos para ambas versiones) | `salida/subtitulos-es.srt` (también `data/subtitulos.vtt`) |
| Página interactiva (reproductor 3D, cerebro y moléculas girables) | `index.html` |

## Qué dice el audio

> Hoy hablaremos de medicamentos. En principal, hablaremos de los opioides,
> porque son un grupo farmacológico muy interesante que actúa sobre el sistema
> nervioso, en ciertos receptores del cerebro que ya veremos más adelante.
> Entonces… ¿qué es un opioide? Bueno, un opioide son una serie de moléculas,
> las cuales tienen una estructura específica… que parten de un grupo familiar
> en específico. Entonces… ¿qué hacen o en dónde interactúan los opioides?
> Bueno, los opioides interactúan sobre unos receptores en las neuronas llamados
> kappa, mu y (¿delta?). En esos receptores actúa. Actúa alterando el potencial
> de acción, deprimiendo el sistema nervioso para ejercer su mecanismo
> terapéutico.

La transcripción completa con tiempos está en `data/transcripcion.json`. El
tercer receptor (49,9–50,3 s) apenas se oye: dos modelos de Whisper oyen
«mu y …»; por contexto se interpreta como delta y así se señala en todo el
material.

## Estructura del vídeo

1. **0:00–1:07 · Narración original** con animación sincronizada palabra a
   palabra: medicamentos → opioides (cápsula de *Papaver somniferum*),
   sistema nervioso y regiones con receptores, estructura de la morfina
   (núcleo 4,5‑epoximorfinano y farmacóforo), familia de morfinanos, receptores
   κ, μ, δ y NOP como GPCR, y sinapsis con Gi/o, GIRK, Ca²⁺ y la traza del
   potencial de membrana.
2. **1:07–2:35 · Cinco aclaraciones** narradas con voz sintética: dónde están
   los receptores, qué define a un opioide, los cuatro receptores, qué pasa
   realmente con el potencial de acción y por qué «deprimir» incluye desinhibir.
3. **2:35–2:47 · Resumen** y fuentes.

## Página interactiva

`index.html` reproduce la misma animación sincronizada con la banda sonora
(transcripción navegable, capítulos, velocidad) y añade módulos para explorar:
mapa de receptores en el cuerpo, visor de moléculas (morfina, codeína, heroína,
naloxona, fentanilo, metadona), explorador de receptores con línea de tiempo,
simulador del potencial de membrana con naloxona, circuito de desinhibición
dopaminérgica, tabla de aclaraciones y un quiz.

Para abrirla en local hace falta un servidor con soporte de rangos HTTP (para
poder saltar dentro del audio):

```bash
npx http-server -c-1 .
# y abre http://127.0.0.1:8080/index.html
```

## Versión 3D: cómo se hizo

Renderizar los ~5000 fotogramas con trazado de rayos en CPU llevaría decenas
de horas, así que se usa la técnica habitual en divulgación científica:

1. **Recursos 3D con Blender Cycles** (`video3d/blender/`, bpy como módulo):
   - Cerebro humano real: superficie pial *fsaverage5* de FreeSurfer (nilearn),
     en versión de tejido (dispersión subsuperficial, surcos según la
     profundidad sulcal real) y de rayos X, en giro de 48° (120 fotogramas).
     Cerebelo, tronco y médula procedurales en coordenadas MNI.
   - Bicapa lipídica en corte con un receptor GPCR (7 hélices en cintas con la
     geometría de la α‑hélice), proteína G heterotrimérica y morfina a escala
     real en el sitio de unión; 4 variantes de color (μ, δ, κ, NOP).
   - Sinapsis con vesículas, receptores μ, canal de Ca²⁺ y canal GIRK.
   - Plano de producto con medicamentos, cápsula de adormidera con látex,
     red de neuronas con desenfoque de profundidad.
   - Esferas atómicas fotorrealistas (C, H, O, N) e iones (K⁺, Ca²⁺).
2. **Moléculas con geometría real** (`video3d/preparar_datos.py`): conformación
   de mínima energía con RDKit (ETKDGv3 + MMFF94s). El compositor las dibuja
   átomo a átomo con las esferas de Cycles, ordenadas por profundidad, con
   sombras de contacto y niebla, así que giran con suavidad a cualquier ángulo.
3. **Compositor** (`assets/js/escenario3d.js`): movimientos de cámara sobre
   los renders, cambio de foco, partículas, iones, ligandos, rótulos con
   líneas guía y subtítulos, sincronizado con la banda sonora.

```bash
pip install bpy==4.2.0 rdkit nilearn pillow
python3 video3d/preparar_datos.py          # moléculas 3D y malla del cerebro
python3 video3d/renderizar_recursos.py     # renders Cycles (≈2 h en 4 núcleos)
python3 video3d/exportar_web.py            # versiones ligeras para la web
python3 video/render.py                    # vídeo 3D + miniatura
```

El receptor es un modelo esquemático de un GPCR de clase A (no una estructura
cristalográfica) y así se indica en la página.

## Cómo se construyó (reproducible)

```bash
pip install sherpa-onnx rdkit av soundfile scipy imageio-ffmpeg playwright

# 1. Transcripción automática (luego revisada a mano en data/transcripcion.json)
python3 scripts/transcribir.py RUTA_MODELOS turbo

# 2. Moléculas: SMILES → coordenadas 2D, validadas por fórmula e InChIKey
python3 scripts/moleculas.py

# 3. Voz de las aclaraciones, línea de tiempo, música, mezcla (−14,5 LUFS),
#    subtítulos y assets/js/datos.js
TTS_DIR=RUTA/vits-piper-es_MX-claude-high python3 scripts/construir_datos.py

# 4. Vídeo: Chromium headless recorre assets/js/stage.js fotograma a fotograma
python3 video/render.py                  # vídeo completo + miniatura
python3 video/render.py --muestras 30,90 # solo fotogramas sueltos
```

`assets/js/stage.js` es determinista (el fotograma depende solo del tiempo),
por eso la web y el vídeo muestran exactamente lo mismo.

Los modelos se descargan de las *releases* de
[k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx/releases):
`asr-models/sherpa-onnx-whisper-turbo`, `asr-models/sherpa-onnx-whisper-large-v3`,
`asr-models/silero_vad.onnx` y `tts-models/vits-piper-es_MX-claude-high`.
Cada locución sintética se verificó re-transcribiéndola con Whisper large‑v3.

## Rigor y fuentes

- Goodman & Gilman, 14.ª ed. (2023) y Katzung, 16.ª ed. (2024), capítulos de opioides.
- IUPHAR/BPS Guide to Pharmacology, familia de receptores opioides.
- Artículos originales citados en la página (Pert y Snyder 1973; Hughes y col.
  1975; Martin y col. 1976; Lord y col. 1977; Johnson y North 1992; Manglik y
  col. 2012; Al‑Hasani y Bruchas 2011).
- Las trazas de potencial de membrana son un modelo ilustrativo (integración y
  disparo con fuga), no registros reales, y así se indica en pantalla.

Contenido educativo; no sustituye la orientación de un profesional de la salud.

## Licencias de terceros

- Fuentes tipográficas (Bricolage Grotesque, Atkinson Hyperlegible, Noto Serif
  Display, JetBrains Mono): SIL Open Font License, en `assets/fonts/`.
- Voz Piper `es_MX-claude-high`: Apache‑2.0.
- Música: sintetizada por `scripts/construir_datos.py`.
