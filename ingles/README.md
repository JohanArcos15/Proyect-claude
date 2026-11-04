# Dosis de Inglés

App para aprender inglés (de A2 hacia B2), pensada para una estudiante o un estudiante de química farmacéutica.
Cada día propone una «prescripción» de unos 58 minutos. Cada paso aplica un principio con evidencia
en aprendizaje de idiomas y psicología de la memoria.

| Paso | Qué haces | Principio |
|---|---|---|
| Repaso espaciado | Tarjetas (inglés → español y luego español → inglés) | Práctica de recuperación + espaciado |
| Oído fino | Pares mínimos con muchas voces (ship/sheep, cap/cup…) | HVPT, inteligibilidad, carga funcional |
| Escucha | Diálogos de farmacia y laboratorio: preguntas → dictado → transcripción → shadowing | Input comprensible, noticing |
| Gramática | Calentamiento → regla → error típico del hispanohablante → práctica | Pretesting, instrucción explícita |
| Habla | Preguntas rápidas, técnica 4/3/2, conversación con IA, lectura en voz alta con dictado | Output, fluidez por repetición, feedback |
| Lectura / escritura | Textos graduados (paracetamol, antibióticos, ADME, abstracts) y escritos con corrección | Input + output con feedback |
| Cierre | Resumen y cuándo y dónde estudiarás mañana | Intenciones de implementación |

La sección **La ciencia** de la app explica cada principio, su nivel de evidencia (sólido, respaldado,
emergente, discutido o mito) y las referencias.

## Archivos

- `src/data/*.js`: contenido (vocabulario, sonidos, diálogos, gramática, lecturas, habla, ciencia, prueba de nivel).
- `src/app/*.js`: lógica (estado, voz, plan, repaso espaciado y cada módulo).
- `src/styles.css`, `src/shell.html`: diseño y estructura.
- `build.py`: une todo en dos archivos:
  - `dist/dosis-de-ingles.html`: versión publicada como artefacto en Claude. Guarda el progreso en tu cuenta e incluye el tutor con IA.
  - `index.html`: versión independiente para abrir en el navegador. Guarda el progreso en ese navegador y usa el micrófono del navegador para dictar. No incluye tutor con IA.

```bash
python3 ingles/build.py
```

## Limitaciones conocidas

- El audio usa las voces del sistema (síntesis de voz). Instalar varias voces en inglés mejora el
  entrenamiento del oído.
- Dentro de Claude, la página no puede usar el micrófono directamente. Para hablar se usa el dictado
  del teclado del teléfono, en inglés.
- Las horas hacia cada nivel son orientativas (horas guiadas de Cambridge English) y la prueba de
  nivel no es oficial.
