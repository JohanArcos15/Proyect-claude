# NeuroFarma 3D

Aplicación interactiva para estudiar **cómo actúan los fármacos del sistema
nervioso central sobre los neurotransmisores**. Pensada para la clase de
Farmacología (Química Farmacéutica) y basada en los temas del Parcial 2 de
Farmacología General.

**Para abrirla:** doble clic en `index.html`. Funciona sin servidor y sin
internet (todo va incluido en `app.js` y `app.css`). Se recomienda Chrome,
Edge o Firefox actualizados, con aceleración gráfica activada.

## Qué incluye

| Módulo | Qué muestra |
|---|---|
| **Cerebro 3D** | Corteza real (FreeSurfer *fsaverage6*, 82 000 vértices por hemisferio) en modo cristal o tejido, con sus giros identificados (Desikan-Killiany); estructuras profundas reales (atlas Harvard-Oxford: tálamo, estriado, hipocampo, amígdala, accumbens, tronco, cerebelo); núcleos del tronco y del hipotálamo; las vías de cada neurotransmisor con partículas que fluyen; sitios de unión del fármaco; crisis epilépticas que se propagan y vías que se bloquean. |
| **Nivel molecular** | Sinapsis animada (vesículas, Ca²⁺, exocitosis, recaptación, receptores ionotrópicos y GPCR con proteína G, GIRK, AMPc) con el fármaco uniéndose a su sitio exacto; canal de Na⁺ con compuertas (anestésicos locales con pH/pKa, bloqueo dependiente del uso); canal T talámico; COX e inflamación; placa motora con RyR1 e hipertermia maligna; hígado (acetaminofén, NAPQI y N-acetilcisteína). |
| **Potencial de acción** | Modelo Hodgkin-Huxley de neurona cortical (Pospischil 2008) con las mismas entradas sinápticas con y sin fármaco; protocolos de tren de alta frecuencia, neurona talámica con ráfagas de rebote (canal T), axón que conduce o se bloquea, nociceptor sensibilizado, neurona estriatal D2 y fibra muscular. |
| **EEG y monitor** | EEG sintético, espectrograma (DSA) e índice tipo BIS, con patrones de cada fármaco (beta de las BZD, alfa frontal del propofol, gamma de la ketamina, husos de la dexmedetomidina, supresión de ráfagas, punta-onda de 3 Hz, polipuntas); indicadores de conciencia, respiración, dolor, ansiedad, ocupación D2, SEP, prolactina… |
| **Ficha y química** | Mecanismo, farmacocinética, pKa e ionización, efectos adversos, antídoto y el dato clave para el parcial. Estructura 2D con los grupos funcionales que explican la relación estructura-actividad, molécula 3D girable (conformación de mínima energía) y descriptores (masa, cLogP, TPSA, Lipinski). |
| **Simulador de dosis** | Curvas dosis-efecto (techo de las BZD frente a los barbitúricos, depresión respiratoria de los opioides y efecto de la naloxona), ocupación D2 con ventana terapéutica, cinética de Michaelis-Menten de la fenitoína, CAM de los inhalados y pH tisular para anestésicos locales. Todo el resto de la app responde al deslizador. |
| **Recorridos guiados** | 9 recorridos (uno por categoría) que mueven la cámara, eligen el fármaco y destacan el panel que hay que mirar. |
| **Comparador** | Dos fármacos lado a lado con su mecanismo animado, sus estructuras, curvas superpuestas y perfil de afinidades. |
| **Casos clínicos** | 9 casos paso a paso (incluidos los del parcial: hipertermia maligna, crisis tónico-clónica con deseo de embarazo y trastorno de pánico). |
| **Quiz** | ~60 preguntas de selección múltiple, verdadero/falso y completar, con explicación y modo «parcial». |

Categorías: Fundamentos · Analgesia · Anestesia · Sedación · Hipnosis ·
Ansiolíticos · Barbitúricos · Antiepilépticos · Antipsicóticos (≈ 80 fármacos).

## Estructura

```
neurofarmacologia/
├── index.html, app.js, app.css   ← la app ya compilada (lo único necesario)
├── fuentes/                      ← tipografías OFL
├── src/
│   ├── main.js                   ← controlador
│   ├── datos/                    ← fármacos, clases, categorías, quiz, casos, anatomía
│   │   ├── cerebro.bin           ← mallas del cerebro (gzip)
│   │   └── moleculas.json.gz     ← estructuras 2D/3D y descriptores
│   ├── logica/escena.js          ← fármaco + dosis → configuración de cada vista
│   ├── vistas/                   ← cerebro 3D, sinapsis, potencial, monitor, molécula
│   ├── ui/                       ← panel lateral, simulador, recorrido, herramientas
│   └── util/                     ← modelo de neurona, dibujo, decodificación
└── herramientas/
    ├── construir.mjs             ← empaquetado con esbuild
    ├── preparar_cerebro.py       ← TemplateFlow → cerebro.bin
    └── preparar_moleculas.py     ← RDKit → moleculas.json.gz
```

## Reconstruir

```bash
cd neurofarmacologia
npm install
npm run build            # app.js y app.css
npm run dev              # recompila al guardar

# datos (opcional, ya están generados)
pip install nibabel scikit-image scipy trimesh fast-simplification rdkit
python3 herramientas/preparar_cerebro.py
python3 herramientas/preparar_moleculas.py
```

`preparar_moleculas.py` comprueba la fórmula molecular de cada SMILES y que
cada grupo químico resaltado exista en la molécula; si algo no coincide, se
detiene.

## Fuentes y rigor

- Goodman & Gilman, *Las bases farmacológicas de la terapéutica*, 14.ª ed.;
  Katzung, *Farmacología básica y clínica*, 16.ª ed.; Flórez, *Farmacología
  humana*, 7.ª ed.; Stahl, *Essential Psychopharmacology*, 5.ª ed.; Miller's
  *Anesthesia*, 9.ª ed.
- Ocupación D2: Kapur S et al., Am J Psychiatry 2000;157:514. Afinidades
  (pKi): PDSP Ki Database (valores aproximados).
- Interruptor sueño-vigilia: Saper CB et al., Neuron 2010;68:1023.
- EEG en anestesia: Purdon PL et al., Anesthesiology 2015;123:937.
- Modelo de neurona: Pospischil M et al., Biol Cybern 2008;99:427; canal T:
  Destexhe A et al., J Neurophysiol 1996;76:2049.
- Anatomía: FreeSurfer *fsaverage* (Fischl 1999) y atlas Harvard-Oxford
  (FSL), descargados de TemplateFlow (Ciric et al., Nat Methods 2022).
  Los núcleos pequeños y las vías son trazados esquemáticos en posiciones
  aproximadas del espacio MNI.
- Moléculas: RDKit (ETKDGv3 + MMFF94s); cLogP de Crippen.

Las curvas dosis-efecto, las trazas eléctricas y el EEG son **modelos
didácticos**: reproducen la forma de los fenómenos descritos en la
literatura, no datos de pacientes, y no sirven para calcular dosis.
Contenido educativo; no sustituye la orientación de un profesional de la salud.

## Licencias de terceros

Three.js y fflate (MIT, incluidas en `app.js`); Atkinson Hyperlegible,
Bricolage Grotesque, JetBrains Mono e Inter (SIL OFL 1.1); FreeSurfer
fsaverage (licencia de FreeSurfer) y atlas Harvard-Oxford (licencia de FSL,
uso no comercial).
