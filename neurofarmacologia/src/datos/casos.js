// Casos clínicos interactivos. Cada paso tiene opciones con retroalimentación.
// tipo 'unica': una respuesta; 'multiple': marcar todas las correctas.

export const CASOS = [
  {
    id: 'hm', cat: 'anestesia', titulo: 'Fiebre y rigidez en el quirófano',
    resumen: 'Hombre de 29 años bajo anestesia general con un halogenado y un relajante.',
    presentacion: 'Hombre de 29 años, sin antecedentes relevantes, en cirugía bajo anestesia general. Tras la administración de un anestésico inhalado y un relajante neuromuscular presenta un aumento súbito de la frecuencia cardiaca, rigidez generalizada (sobre todo mandibular), elevación rápida de la temperatura hasta 40,2 °C, aumento del CO₂ espirado y acidosis metabólica en los gases arteriales.',
    signos: [['FC', '148 lpm'], ['T°', '40,2 °C'], ['EtCO₂', '78 mmHg'], ['pH', '7,12']],
    farmaco: 'dantroleno', opciones: { hipertermia: true },
    pasos: [
      { pregunta: '¿Cuál es el diagnóstico más probable?', tipo: 'unica', opciones: [
        { t: 'Hipertermia maligna', ok: true, fb: 'Correcto: hipermetabolismo muscular por liberación descontrolada de Ca²⁺ (RyR1 mutado) desencadenada por halogenados y succinilcolina.' },
        { t: 'Sepsis', fb: 'La sepsis no aparece de forma súbita en minutos ni produce rigidez del masetero.' },
        { t: 'Síndrome neuroléptico maligno', fb: 'Se asocia a antipsicóticos y se instala en días.' },
        { t: 'Anestesia superficial', fb: 'No explica la hipertermia ni la acidosis.' },
      ] },
      { pregunta: '¿Cuál es la medida inmediata más importante?', tipo: 'unica', opciones: [
        { t: 'Suspender el agente desencadenante (halogenado y succinilcolina), hiperventilar con O₂ al 100 % y pedir ayuda', ok: true, fb: 'Correcto: retirar el desencadenante es lo primero; se cambia a anestesia intravenosa si hay que continuar.' },
        { t: 'Aumentar la concentración del halogenado', fb: 'Empeoraría el cuadro: el halogenado es el desencadenante.' },
        { t: 'Administrar otra dosis de succinilcolina para relajar', fb: 'La succinilcolina también es desencadenante.' },
        { t: 'Dar acetaminofén IV', fb: 'La fiebre no es por el hipotálamo: los antipiréticos no sirven.' },
      ] },
      { pregunta: '¿Cuál es el tratamiento farmacológico de elección?', tipo: 'unica', opciones: [
        { t: 'Dantroleno IV 2,5 mg/kg, repetido hasta controlar los signos', ok: true, fb: 'Correcto: bloquea el RyR1 y frena la salida de Ca²⁺ del retículo sarcoplásmico.' },
        { t: 'Neostigmina', fb: 'Revierte relajantes no despolarizantes; no actúa sobre el RyR1.' },
        { t: 'Rocuronio', fb: 'Actúa en la placa, no en el retículo sarcoplásmico.' },
        { t: 'Flumazenil', fb: 'Es antagonista benzodiacepínico.' },
      ] },
      { pregunta: 'Marca los fármacos que pueden desencadenar esta condición.', tipo: 'multiple', opciones: [
        { t: 'Sevoflurano', ok: true }, { t: 'Desflurano', ok: true }, { t: 'Succinilcolina', ok: true }, { t: 'Isoflurano', ok: true }, { t: 'Halotano', ok: true },
        { t: 'Propofol' }, { t: 'Rocuronio' }, { t: 'Fentanilo' }, { t: 'Óxido nitroso' },
      ], explicacion: 'Desencadenan: todos los anestésicos halogenados y la succinilcolina. Son seguros: propofol, opioides, relajantes no despolarizantes, óxido nitroso, benzodiacepinas y anestésicos locales.' },
    ],
    cierre: 'Además: enfriamiento activo, tratar la hiperpotasemia y la acidosis, vigilar la diuresis (mioglobinuria) y estudiar al paciente y a su familia (biopsia muscular / genética del RYR1).',
  },
  {
    id: 'tcg', cat: 'antiepilepticos', titulo: 'Crisis en clase y deseo de embarazo',
    resumen: 'Mujer de 32 años con episodios convulsivos que planea embarazarse.',
    presentacion: 'Mujer de 32 años que pierde el conocimiento de forma brusca en clase. Testigos describen rigidez generalizada inicial, luego movimientos rítmicos de todo el cuerpo, mordedura de lengua y relajación de esfínteres; después queda confusa y somnolienta. Ha tenido episodios similares en los últimos meses. No consume alcohol ni drogas. Planea quedar embarazada el próximo año. El médico inicia un anticonvulsivante clásico de amplio espectro que aumenta el GABA y bloquea canales de Na⁺.',
    signos: [['Conciencia', 'Confusa (postcrítica)'], ['Lengua', 'Mordedura lateral'], ['Esfínteres', 'Relajación']],
    farmaco: 'valproato', opciones: { crisis: 'tonicoClonica' },
    pasos: [
      { pregunta: '¿Qué tipo de crisis presenta?', tipo: 'unica', opciones: [
        { t: 'Crisis tónico-clónica generalizada', ok: true, fb: 'Correcto: pérdida brusca de conciencia, fase tónica, fase clónica y estado postcrítico.' },
        { t: 'Crisis de ausencia', fb: 'Las ausencias duran segundos, sin caída, sin convulsiones ni confusión posterior.' },
        { t: 'Crisis focal sin alteración de la conciencia', fb: 'Aquí hay pérdida de la conciencia y afectación bilateral.' },
        { t: 'Síncope', fb: 'El síncope no produce mordedura lateral de lengua ni confusión prolongada.' },
      ] },
      { pregunta: '¿Cuál es el fármaco más probable que se indicó?', tipo: 'unica', opciones: [
        { t: 'Ácido valproico', ok: true, fb: 'Correcto: amplio espectro, aumenta el GABA (inhibe su degradación) y bloquea canales de Na⁺ y la corriente T.' },
        { t: 'Etosuximida', fb: 'Solo sirve en ausencias (canal T).' },
        { t: 'Fenitoína', fb: 'Bloquea canales de Na⁺, pero no aumenta el GABA ni es de amplio espectro.' },
        { t: 'Gabapentina', fb: 'Es un ligando α2δ de espectro estrecho.' },
      ] },
      { pregunta: '¿Qué consideración es importante antes de iniciarlo en esta paciente?', tipo: 'unica', opciones: [
        { t: 'Su elevado riesgo teratógeno: valorar alternativas, anticoncepción y ácido fólico, y planificar el embarazo', ok: true, fb: 'Correcto: es el antiepiléptico con más riesgo de malformaciones (tubo neural) y alteraciones del neurodesarrollo.' },
        { t: 'Que causa hiperplasia gingival', fb: 'Eso es de la fenitoína.' },
        { t: 'Que debe tomarse con alcohol', fb: 'Nunca: potencia la sedación.' },
        { t: 'Que solo sirve para las ausencias', fb: 'Es de amplio espectro.' },
      ] },
      { pregunta: 'Marca dos alternativas más recientes y más seguras.', tipo: 'multiple', opciones: [
        { t: 'Lamotrigina', ok: true }, { t: 'Levetiracetam', ok: true }, { t: 'Fenobarbital' }, { t: 'Fenitoína' }, { t: 'Topiramato' },
      ], explicacion: 'Lamotrigina y levetiracetam tienen las tasas más bajas de malformaciones en los registros de embarazo. El topiramato se asocia a labio leporino; fenobarbital y fenitoína también son teratógenos.' },
    ],
    cierre: 'Con lamotrigina hay que titular despacio (exantema) y vigilar sus niveles en el embarazo, porque los estrógenos aceleran su eliminación.',
  },
  {
    id: 'panico', cat: 'ansioliticos', titulo: 'Crisis de pánico',
    resumen: 'Mujer de 28 años con episodios súbitos de miedo intenso.',
    presentacion: 'Mujer de 28 años que consulta por nerviosismo, intranquilidad, sensación de pánico, sudoración, temblores, cansancio y problemas para dormir desde hace dos semanas. Los episodios aparecen de forma inesperada, alcanzan gran intensidad en pocos minutos y luego ceden. No hay alteraciones orgánicas. El médico decide administrar un fármaco que potencia el GABA aumentando la frecuencia de apertura del canal de Cl⁻.',
    signos: [['FC en crisis', '120 lpm'], ['Exploración', 'Normal'], ['TSH', 'Normal']],
    farmaco: 'alprazolam',
    pasos: [
      { pregunta: '¿Cuál es el diagnóstico?', tipo: 'unica', opciones: [
        { t: 'Trastorno de pánico (crisis de angustia)', ok: true, fb: 'Correcto: crisis inesperadas y recurrentes que alcanzan su máximo en minutos, sin causa orgánica.' },
        { t: 'Trastorno de ansiedad generalizada', fb: 'En el TAG la preocupación es persistente y difusa, no en crisis súbitas.' },
        { t: 'Hipertiroidismo', fb: 'La evaluación orgánica fue normal.' },
        { t: 'Depresión mayor', fb: 'Los síntomas centrales son las crisis de pánico.' },
      ] },
      { pregunta: '¿Qué grupo farmacológico aumenta la frecuencia de apertura del canal de Cl⁻?', tipo: 'unica', opciones: [
        { t: 'Benzodiacepinas', ok: true, fb: 'Correcto: moduladores alostéricos positivos del GABA-A.' },
        { t: 'Barbitúricos', fb: 'Aumentan la DURACIÓN de la apertura.' },
        { t: 'ISRS', fb: 'Actúan sobre el transportador de serotonina.' },
        { t: 'Azapironas', fb: 'Son agonistas parciales 5-HT1A.' },
      ] },
      { pregunta: 'Marca dos benzodiacepinas útiles en esta paciente.', tipo: 'multiple', opciones: [
        { t: 'Alprazolam', ok: true }, { t: 'Clonazepam', ok: true }, { t: 'Lorazepam', ok: true }, { t: 'Zolpidem' }, { t: 'Buspirona' }, { t: 'Fenobarbital' },
      ], explicacion: 'Alprazolam y clonazepam tienen indicación en el trastorno de pánico (el lorazepam también se usa). El zolpidem no es benzodiacepina, la buspirona tampoco y el fenobarbital es un barbitúrico.' },
      { pregunta: 'Marca las recomendaciones correctas para usar benzodiacepinas.', tipo: 'multiple', opciones: [
        { t: 'Usar la menor dosis eficaz durante el menor tiempo posible (2-4 semanas)', ok: true },
        { t: 'Retirarlas de forma gradual, nunca de golpe', ok: true },
        { t: 'Evitar el alcohol, los opioides y otros depresores del SNC', ok: true },
        { t: 'No conducir ni operar maquinaria peligrosa', ok: true },
        { t: 'Precaución en ancianos (caídas) y en el embarazo', ok: true },
        { t: 'Mantenerlas indefinidamente como único tratamiento' },
        { t: 'Duplicar la dosis si aparece tolerancia' },
      ], explicacion: 'Además: asociar psicoterapia (terapia cognitivo-conductual) y un tratamiento de fondo con ISRS (sertralina, escitalopram).' },
    ],
    cierre: 'A largo plazo, el tratamiento de elección es un ISRS + psicoterapia; la benzodiacepina se usa como puente las primeras semanas.',
  },
  {
    id: 'opioides', cat: 'analgesia', titulo: 'Somnolencia y respiración lenta',
    resumen: 'Paciente posoperado con fentanilo que no despierta bien.',
    presentacion: 'Mujer de 62 años en el posoperatorio con analgesia controlada por el paciente (fentanilo). La enfermera la encuentra muy somnolienta, con pupilas puntiformes y respiración lenta y superficial.',
    signos: [['FR', '6 rpm'], ['SatO₂', '86 %'], ['Pupilas', 'Mióticas'], ['Glasgow', '9']],
    farmaco: 'naloxona',
    pasos: [
      { pregunta: '¿Qué explica el cuadro?', tipo: 'unica', opciones: [
        { t: 'Depresión respiratoria por opioides (receptores μ del bulbo)', ok: true, fb: 'Correcto: la tríada miosis + depresión respiratoria + depresión de conciencia es típica.' },
        { t: 'Intoxicación por AINE', fb: 'Los AINE no deprimen la respiración ni causan miosis.' },
        { t: 'Hipoglucemia', fb: 'No explica la miosis.' },
        { t: 'Reacción alérgica', fb: 'No hay datos de anafilaxia.' },
      ] },
      { pregunta: '¿Qué fármaco administras?', tipo: 'unica', opciones: [
        { t: 'Naloxona IV en dosis pequeñas repetidas', ok: true, fb: 'Correcto: antagonista competitivo μ. Se titula para recuperar la respiración sin quitar toda la analgesia.' },
        { t: 'Flumazenil', fb: 'Revierte benzodiacepinas, no opioides.' },
        { t: 'N-acetilcisteína', fb: 'Es el antídoto del acetaminofén.' },
        { t: 'Atropina', fb: 'No revierte el efecto opioide.' },
      ] },
      { pregunta: 'Tras revertir, la paciente vuelve a dormirse a los 60 minutos. ¿Por qué?', tipo: 'unica', opciones: [
        { t: 'La naloxona dura menos que el opioide: renarcotización', ok: true, fb: 'Correcto: puede requerir nuevas dosis o una infusión y vigilancia prolongada.' },
        { t: 'La naloxona es un agonista parcial', fb: 'Es un antagonista puro.' },
        { t: 'Desarrolló tolerancia a la naloxona', fb: 'No ocurre en minutos.' },
      ] },
    ],
    cierre: 'Prevención: vigilar sedación y FR, ajustar dosis en ancianos e insuficiencia renal y evitar combinar con benzodiacepinas.',
  },
  {
    id: 'acetaminofen', cat: 'analgesia', titulo: 'Sobredosis de acetaminofén',
    resumen: 'Ingesta intencional de 15 g hace 6 horas.',
    presentacion: 'Estudiante de 19 años que ingirió 30 tabletas de 500 mg de acetaminofén (15 g) hace 6 horas. Está asintomática, con náuseas leves.',
    signos: [['Peso', '55 kg'], ['Dosis', '≈ 270 mg/kg'], ['Tiempo', '6 h'], ['Síntomas', 'Náuseas']],
    farmaco: 'acetilcisteina', opciones: { dosisParacetamol: 4 },
    pasos: [
      { pregunta: '¿Por qué es peligrosa esta ingesta aunque la paciente esté asintomática?', tipo: 'unica', opciones: [
        { t: 'Las vías de glucuronidación y sulfatación se saturan, se forma más NAPQI y se agota el glutatión hepático', ok: true, fb: 'Correcto: el daño hepático aparece a las 24-72 h.' },
        { t: 'Porque deprime la respiración', fb: 'El acetaminofén no deprime la respiración.' },
        { t: 'Porque produce úlcera gástrica', fb: 'No es su toxicidad característica.' },
      ] },
      { pregunta: '¿Qué antídoto indicas?', tipo: 'unica', opciones: [
        { t: 'N-acetilcisteína', ok: true, fb: 'Correcto: repone el glutatión; es más eficaz antes de 8-10 h.' },
        { t: 'Naloxona', fb: 'Es antagonista opioide.' },
        { t: 'Flumazenil', fb: 'Es antagonista benzodiacepínico.' },
        { t: 'Vitamina K', fb: 'No protege al hepatocito.' },
      ] },
      { pregunta: '¿Qué herramienta guía la decisión?', tipo: 'unica', opciones: [
        { t: 'La concentración plasmática a partir de las 4 h en el nomograma de Rumack-Matthew', ok: true, fb: 'Correcto. Con más de 8 h o ingesta masiva se inicia la NAC sin esperar el resultado.' },
        { t: 'El nivel de conciencia', fb: 'La paciente puede estar consciente y en riesgo.' },
        { t: 'La presión arterial', fb: 'No predice la hepatotoxicidad.' },
      ] },
    ],
    cierre: 'Factores de riesgo: alcoholismo crónico (induce CYP2E1), ayuno, desnutrición e inductores enzimáticos.',
  },
  {
    id: 'induccion', cat: 'anestesia', titulo: 'Inducción en un paciente en choque',
    resumen: 'Politraumatizado hipotenso que necesita intubación.',
    presentacion: 'Hombre de 40 años politraumatizado, con sangrado activo, que requiere intubación de secuencia rápida para cirugía urgente.',
    signos: [['PA', '78/45 mmHg'], ['FC', '128 lpm'], ['Glasgow', '12']],
    farmaco: 'ketamina',
    pasos: [
      { pregunta: '¿Qué hipnótico es más apropiado?', tipo: 'unica', opciones: [
        { t: 'Ketamina (o etomidato)', ok: true, fb: 'Correcto: la ketamina mantiene el tono simpático y el etomidato casi no deprime el sistema cardiovascular.' },
        { t: 'Propofol a dosis plenas', fb: 'Produce vasodilatación e hipotensión marcada en un paciente hipovolémico.' },
        { t: 'Tiopental', fb: 'Deprime el miocardio y produce hipotensión.' },
        { t: 'Midazolam como único fármaco', fb: 'Inicio más lento y también hipotensión.' },
      ] },
      { pregunta: '¿Qué relajante permite una secuencia rápida si la succinilcolina está contraindicada (p. ej., hiperpotasemia)?', tipo: 'unica', opciones: [
        { t: 'Rocuronio a dosis alta (1,2 mg/kg)', ok: true, fb: 'Correcto: inicio en ≈ 60 s y reversible con sugammadex.' },
        { t: 'Dantroleno', fb: 'No es un bloqueante neuromuscular.' },
        { t: 'Fentanilo', fb: 'Es un opioide; no relaja la musculatura.' },
      ] },
      { pregunta: 'Si se elige etomidato, ¿qué efecto adverso hay que recordar?', tipo: 'unica', opciones: [
        { t: 'Supresión suprarrenal (inhibe la 11β-hidroxilasa)', ok: true, fb: 'Correcto: incluso con una dosis única.' },
        { t: 'Hipertermia maligna', fb: 'El etomidato no es desencadenante.' },
        { t: 'Depresión respiratoria prolongada por días', fb: 'Su efecto dura minutos.' },
      ] },
    ],
    cierre: 'En anestesia la elección del hipnótico depende del estado hemodinámico; los efectos adversos son a menudo la clave.',
  },
  {
    id: 'ausencias', cat: 'antiepilepticos', titulo: 'La niña que «se desconecta»',
    resumen: 'Niña de 7 años con episodios breves de mirada fija.',
    presentacion: 'Niña de 7 años cuyos profesores notan que «se queda en blanco» varias veces al día durante 5-10 segundos, parpadea y luego sigue como si nada. La hiperventilación en consulta desencadena un episodio. EEG: punta-onda generalizada a 3 Hz.',
    signos: [['Duración', '5-10 s'], ['Frecuencia', 'Decenas al día'], ['EEG', 'Punta-onda 3 Hz']],
    farmaco: 'etosuximida', opciones: { crisis: 'ausencia' },
    pasos: [
      { pregunta: '¿Qué tipo de crisis es?', tipo: 'unica', opciones: [
        { t: 'Crisis de ausencia típica', ok: true, fb: 'Correcto: desconexión breve, sin caída ni estado postcrítico, punta-onda de 3 Hz.' },
        { t: 'Crisis tónico-clónica', fb: 'No hay convulsiones.' },
        { t: 'Crisis focal del lóbulo temporal', fb: 'El EEG es generalizado.' },
      ] },
      { pregunta: '¿Cuál es el fármaco de primera línea?', tipo: 'unica', opciones: [
        { t: 'Etosuximida', ok: true, fb: 'Correcto: bloquea los canales de Ca²⁺ tipo T del tálamo (el valproato también es eficaz).' },
        { t: 'Carbamazepina', fb: 'Puede EMPEORAR las ausencias.' },
        { t: 'Fenitoína', fb: 'No es eficaz y puede empeorarlas.' },
        { t: 'Gabapentina', fb: 'Puede empeorarlas.' },
      ] },
      { pregunta: '¿Dónde se origina el ritmo de 3 Hz que bloquea el fármaco?', tipo: 'unica', opciones: [
        { t: 'En el circuito tálamo-cortical (canales de Ca²⁺ tipo T)', ok: true, fb: 'Correcto: cada inhibición reticular desinactiva la corriente T y la neurona dispara una ráfaga de rebote.' },
        { t: 'En el cerebelo', fb: 'El cerebelo no genera las ausencias.' },
        { t: 'En la médula espinal', fb: 'Es un fenómeno tálamo-cortical.' },
      ] },
    ],
    cierre: 'Si además tuviera crisis tónico-clónicas, el valproato (o la lamotrigina) cubriría ambos tipos.',
  },
  {
    id: 'sep', cat: 'antipsicoticos', titulo: 'Cuello torcido tras el antipsicótico',
    resumen: 'Joven con esquizofrenia que inicia haloperidol.',
    presentacion: 'Hombre de 22 años con primer episodio psicótico (alucinaciones auditivas y delirio de persecución). Recibe haloperidol 10 mg/día. Al tercer día presenta contracción sostenida del cuello y desviación de la mirada hacia arriba.',
    signos: [['Cuello', 'Tortícolis'], ['Ojos', 'Crisis oculógira'], ['Prolactina', 'Elevada']],
    farmaco: 'haloperidol',
    pasos: [
      { pregunta: '¿Qué está ocurriendo?', tipo: 'unica', opciones: [
        { t: 'Distonía aguda por bloqueo D2 en la vía nigroestriada', ok: true, fb: 'Correcto: síntoma extrapiramidal típico de los antipsicóticos de alta potencia.' },
        { t: 'Síndrome serotoninérgico', fb: 'No hay hipertermia, clonus ni diarrea.' },
        { t: 'Crisis epiléptica focal', fb: 'Es una postura sostenida inducida por el fármaco.' },
      ] },
      { pregunta: '¿Qué tratamiento inmediato es útil?', tipo: 'unica', opciones: [
        { t: 'Un anticolinérgico (biperideno) o difenhidramina IM/IV', ok: true, fb: 'Correcto: restablecen el equilibrio dopamina-acetilcolina en el estriado.' },
        { t: 'Aumentar el haloperidol', fb: 'Empeoraría el cuadro.' },
        { t: 'Dantroleno', fb: 'Se reserva para el síndrome neuroléptico maligno o la hipertermia maligna.' },
      ] },
      { pregunta: 'Para reducir el riesgo, ¿qué cambio harías?', tipo: 'unica', opciones: [
        { t: 'Pasar a un atípico (o bajar la dosis para una ocupación D2 < 78 %)', ok: true, fb: 'Correcto: risperidona a dosis bajas, olanzapina, quetiapina o aripiprazol.' },
        { t: 'Añadir otro típico', fb: 'Aumentaría el bloqueo D2.' },
        { t: 'Suspender todo tratamiento', fb: 'La psicosis necesita tratamiento.' },
      ] },
    ],
    cierre: 'Mira en la pestaña «Dosis» cómo la ocupación D2 del haloperidol cruza el umbral de los SEP a dosis bajas.',
  },
  {
    id: 'insomnio', cat: 'hipnosis', titulo: 'Insomnio en un adulto mayor',
    resumen: 'Mujer de 78 años que toma difenhidramina para dormir.',
    presentacion: 'Mujer de 78 años con insomnio de conciliación desde hace meses. Toma difenhidramina de venta libre y ha tenido una caída nocturna y episodios de confusión.',
    signos: [['Edad', '78 años'], ['Caídas', '1 este mes'], ['Fármaco', 'Difenhidramina']],
    farmaco: 'difenhidramina',
    pasos: [
      { pregunta: '¿Por qué la difenhidramina es mala opción en ella?', tipo: 'unica', opciones: [
        { t: 'Efectos anticolinérgicos (confusión, retención urinaria) y sedación residual que favorece caídas', ok: true, fb: 'Correcto: está en los criterios de Beers.' },
        { t: 'Porque es una benzodiacepina', fb: 'Es un antihistamínico H1 de primera generación.' },
        { t: 'Porque no atraviesa la BHE', fb: 'Sí la atraviesa: por eso seda.' },
      ] },
      { pregunta: '¿Qué medida es de primera línea en el insomnio crónico?', tipo: 'unica', opciones: [
        { t: 'Terapia cognitivo-conductual para el insomnio e higiene del sueño', ok: true, fb: 'Correcto: es más eficaz a largo plazo que cualquier hipnótico.' },
        { t: 'Una benzodiacepina de vida media larga', fb: 'Aumenta caídas y confusión en ancianos.' },
        { t: 'Barbitúricos', fb: 'Margen de seguridad estrecho.' },
      ] },
      { pregunta: 'Si se necesita un fármaco, ¿cuál es razonable?', tipo: 'unica', opciones: [
        { t: 'Melatonina de liberación prolongada o ramelteón (o doxepina a dosis muy bajas)', ok: true, fb: 'Correcto: sin dependencia ni efecto anticolinérgico relevante.' },
        { t: 'Diazepam', fb: 'Vida media muy larga en ancianos: sedación diurna y caídas.' },
        { t: 'Aumentar la difenhidramina', fb: 'Empeoraría la confusión.' },
      ] },
    ],
    cierre: 'Los fármacos Z también se asocian a caídas en ancianos: si se usan, a la menor dosis y por poco tiempo.',
  },
];
