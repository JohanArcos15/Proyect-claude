# Vocab Lab

App personal para aprender vocabulario en inglés (nivel A2) con un ciclo diario:

| Momento | Qué haces | Dónde |
|---|---|---|
| Mañana | Escribes hasta 5 palabras que escuchaste en videos. Claude genera la ficha: significado, matices y usos, formas, ejemplos en 7 tiempos verbales, collocations y un consejo para hispanohablantes. | **Hoy** |
| Cuando quieras | Pegas un *chunk* (fragmento de oración). Claude lo descompone en piezas con su función gramatical, da el patrón reutilizable, la gramática, ejemplos, transformaciones y chunks parecidos. | **Chunks** |
| Cuando puedas | Repaso espaciado (1, 3, 7, 14 y 30 días) con tres tipos de tarjeta: español → inglés, inglés → español y completar la frase. | **Repaso** |
| Tarde | Writing con un tema del día y tus palabras. Claude corrige solo los 3 errores más importantes. | **Writing** |
| Fin de semana | Copias un "paquete" con tus palabras, lo pegas en un chat nuevo de Claude y practicas en el modo de voz. Al decir "finish", Claude da un resumen que pegas de vuelta para registrarlo. | **Speaking** |
| Siempre | Racha, calendario de participación tipo GitHub, curva de palabras guardadas vs en uso, estado de cada palabra y tiempos verbales usados. | **Progreso** |

Cada día es un *periodo* (fila) de la tabla y cada palabra es un *elemento*:
el color indica el tipo (verbo, sustantivo, adjetivo/adverbio, expresión) y
las cuatro barras de abajo, cuánto la dominas.

**Sir Lex**, un caballero en pixel art (dibujado en un canvas desde una
cuadrícula de 24×32 en `KNIGHT`), aparece al abrir la app y dice frases en
inglés con su traducción: saludos según la hora, frases motivadoras,
recordatorios de repaso y ejemplos de tus propias palabras y chunks.

**Audio:** voces del navegador (`speechSynthesis`) con acento de EE. UU. o
Reino Unido, elegibles en el botón *Voz*.

## Dónde vive

- Página publicada (privada): https://claude.ai/artifact/MpuUV6T7X7LVrwncmKfd5q
- Código: `vocab-lab.html` (fragmento HTML; claude.ai le agrega `<html>`, `<head>` y `<body>` al publicar).
- Datos: la base de datos del artifact (capacidad `db`). Las fichas y las correcciones usan la capacidad `sample`, que gasta el uso de Claude de quien abre la página.

## Esquema de la base de datos

Colección `words` (id = palabra en minúsculas con guiones, p. ej. `give-up`):

```json
{
  "word": "bind", "type": "verb", "ipa": "/baɪnd/", "es": "unir, fijarse",
  "def_en": "...", "level": "B2", "irregular": true,
  "forms": {"base": "bind", "past": "bound", "participle": "bound", "ing": "binding", "third": "binds"},
  "senses": [{"label": "En química", "meaning": "...", "en": "...", "es": "..."}],
  "tenses": [{"tense": "Present simple", "en": "...", "es": "..."}],
  "collocations": [], "family": [], "synonyms": [], "opposite": "", "tip": "",
  "addedOn": "2026-10-30", "createdAt": 1793383802000,
  "box": 0, "due": "2026-10-31", "reviews": 0, "right": 0,
  "usedWriting": 0, "usedSpeaking": 0, "activeOn": null, "masteredOn": null,
  "example": false, "pending": false
}
```

- `type`: `verb`, `phrasal verb`, `noun`, `adjective`, `adverb`, `expression` u `other`.
- `forms` según el tipo: verbos `{base, past, participle, ing, third}`; sustantivos `{plural, countable}`; adjetivos `{comparative, superlative, adverb}`.
- Estado (calculado): Nueva (sin repasos) → Aprendiendo → La reconozco (caja ≥ 3) → La uso (caja ≥ 3 y usada en writing o speaking) → Dominada (caja ≥ 4 y usada en ambos).
- `example: true` marca fichas de muestra que no cuentan en el progreso.

Colección `chunks` (id = chunk en minúsculas con guiones):

```json
{
  "chunk": "it's up to you", "es": "depende de ti", "literal": "...", "meaning": "...",
  "type": "expresión fija", "register": "neutral", "level": "A2", "pattern": "it's up to + persona",
  "parts": [{"text": "it's", "cat": "subject", "role": "sujeto + verbo", "es": "es", "note": "it's = it is"}],
  "grammar": [{"point": "...", "explain": "..."}],
  "examples": [{"en": "...", "es": "..."}],
  "variations": [{"label": "Pregunta", "en": "...", "es": "..."}],
  "similar": [], "tip": "",
  "addedOn": "2026-10-30", "createdAt": 0, "box": 0, "due": "2026-10-31", "reviews": 0, "right": 0
}
```

- `cat`: `subject`, `verb`, `auxiliary`, `object`, `preposition`, `connector`, `modifier` u `other`.
- Los chunks entran al mismo repaso espaciado que las palabras y al paquete de speaking.

Otras colecciones:

- `days/{YYYY-MM-DD}`: `{date, reviews}`, repasos hechos ese día.
- `writings/{auto}`: `{date, createdAt, theme, themeName, prompt, targets[], used[], text, words, feedback}`.
- `speaking/{auto}`: `{date, createdAt, minutes, used[], missing[], errors[{original, fix}], tip, raw}`.

## Agregar palabras desde una sesión de Claude Code

Si la página no puede usar Claude en algún momento, las palabras también se
pueden escribir directamente en `words` con la herramienta `ArtifactData`,
siguiendo el esquema anterior (`addedOn` = fecha de hoy, `due` = mañana,
contadores en 0).
