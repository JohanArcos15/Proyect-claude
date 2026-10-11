// Infografías de cada categoría (pestaña «Claves» del panel lateral).
import { POR_ID } from '../datos/farmacos.js';
import { NT } from '../datos/neurotransmisores.js';
import { ajustarLienzo, aleatorio, rotulo, TINTA, FUENTE } from '../util/dibujo.js';

const chip = (id) => (POR_ID[id] ? `<button class="chip" data-farmaco="${id}">${POR_ID[id].nombre.split(' (')[0]}</button>` : '');

export const INFOGRAFIAS = {
  pasos: {
    titulo: 'La neurotransmisión en 7 pasos',
    html: () => `<ol class="pasos-lista">
      <li><b>Síntesis</b> del neurotransmisor a partir de precursores (p. ej. tirosina → dopamina; glutamato → GABA por la GAD).</li>
      <li><b>Almacenamiento</b> en vesículas (transportadores vesiculares).</li>
      <li>Llega el <b>potencial de acción</b>: se abren canales de Ca²⁺ dependientes de voltaje.</li>
      <li><b>Exocitosis</b>: el Ca²⁺ hace que las vesículas se fusionen y liberen su contenido.</li>
      <li><b>Unión al receptor</b> postsináptico (o presináptico: autorreceptor).</li>
      <li><b>Transducción</b> por el acople receptor-efector → inicio de la actividad postsináptica (potencial excitador o inhibidor, segundos mensajeros).</li>
      <li><b>Terminación</b> (disipación del efecto): recaptación por transportadores, degradación enzimática o difusión.</li>
    </ol>
    <p class="nota">Cada paso es una diana farmacológica: inhibir la recaptación (ISRS), la degradación (vigabatrina), la liberación (levetiracetam) o actuar sobre el receptor.</p>`,
  },
  receptores: {
    titulo: 'Tipos de receptores',
    html: () => `<table class="tabla"><thead><tr><th></th><th>Ionotrópicos</th><th>Metabotrópicos (GPCR)</th></tr></thead><tbody>
      <tr><td>Qué son</td><td>Canales iónicos con sitio de unión</td><td>7 hélices transmembrana + proteína G</td></tr>
      <tr><td>Velocidad</td><td>Milisegundos</td><td>Segundos a minutos</td></tr>
      <tr><td>Ejemplos</td><td>GABA-A (Cl⁻), AMPA y NMDA (Na⁺, Ca²⁺), nicotínico (Na⁺), 5-HT3</td><td>μ, D2, α2, 5-HT1A (Gi/o) · β, D1 (Gs) · H1, 5-HT2A, OX (Gq)</td></tr>
      <tr><td>Fármacos</td><td>BZD, barbitúricos, propofol, ketamina, rocuronio</td><td>Opioides, antipsicóticos, dexmedetomidina, buspirona</td></tr>
    </tbody></table>
    <div class="rejilla">
      <div><b>Gi/o</b>↓ AMPc · abre GIRK (K⁺ sale) · cierra canales de Ca²⁺ → inhibe</div>
      <div><b>Gs</b>↑ AMPc → PKA</div>
      <div><b>Gq</b>Fosfolipasa C → IP₃ (Ca²⁺) y DAG (PKC) → excita</div>
      <div><b>GIRK</b>Canal de K⁺ activado por Gβγ: hiperpolariza</div>
    </div>`,
  },
  acciones: {
    titulo: 'Cómo actúa un fármaco sobre un receptor',
    html: () => `<div class="rejilla">
      <div><b>Agonista</b>Activa el receptor como el neurotransmisor (morfina en μ).</div>
      <div><b>Antagonista</b>Lo ocupa sin activarlo y bloquea al agonista (naloxona, haloperidol).</div>
      <div><b>Agonista parcial</b>Lo activa solo en parte (aripiprazol, buspirona).</div>
      <div><b>Agonista inverso</b>Reduce la actividad basal (antihistamínicos H1).</div>
      <div><b>Modulador alostérico positivo</b>Desde otro sitio, aumenta la respuesta al neurotransmisor (BZD).</div>
      <div><b>Bloqueador de canal</b>Tapona el poro (ketamina, lidocaína).</div>
      <div><b>Inhibidor de la recaptación</b>Bloquea el transportador (ISRS, tiagabina).</div>
      <div><b>Inhibidor enzimático</b>Impide la síntesis o la degradación (AINE, vigabatrina).</div>
    </div>`,
  },
  escaleraOMS: {
    titulo: 'Escalera analgésica de la OMS',
    html: () => `<div class="escalera">
      <div class="escalon" style="border-color:#3fd69b66"><b>Escalón 1</b><small>Dolor leve · no opioides ± coadyuvantes</small>${['paracetamol', 'ibuprofeno', 'naproxeno', 'diclofenaco', 'metamizol', 'aspirina'].map(chip).join('')}</div>
      <div class="escalon" style="border-color:#ffd24d66"><b>Escalón 2</b><small>Dolor moderado · opioides débiles ± escalón 1</small>${['codeina', 'tramadol'].map(chip).join('')}</div>
      <div class="escalon" style="border-color:#ff6b6b66"><b>Escalón 3</b><small>Dolor intenso · opioides fuertes ± escalón 1</small>${['morfina', 'oxicodona', 'fentanilo', 'hidromorfona', 'metadona'].map(chip).join('')}</div>
    </div>
    <p class="nota">Coadyuvantes en cualquier escalón: gabapentinoides, antidepresivos, corticoides. No se combinan dos opioides del mismo escalón. La OMS también propone subir o bajar según la respuesta y empezar en el escalón que corresponda a la intensidad del dolor.</p>`,
  },
  aineRAM: {
    titulo: 'Efectos adversos de los AINE por sistemas',
    html: () => `<div class="rejilla">
      <div class="destacado"><b>Plaquetas</b>Menos tromboxano A₂ → <b>mayor riesgo de hemorragias</b> (aspirina: irreversible, 7-10 días).</div>
      <div><b>Digestivo</b>Dispepsia, úlcera péptica, sangrado y perforación (menos PGE₂/PGI₂ protectoras).</div>
      <div><b>Renal</b>Menor filtración, retención de Na⁺ y agua, hiperpotasemia, nefritis intersticial.</div>
      <div><b>Cardiovascular</b>HTA, insuficiencia cardiaca, IAM y ACV (más con coxibs y diclofenaco).</div>
      <div><b>Hipersensibilidad</b>Asma/broncoespasmo inducido por AINE (desvío a leucotrienos), urticaria, angioedema.</div>
      <div><b>SNC</b>Cefalea, mareo, confusión en ancianos; tinnitus (salicilatos).</div>
    </div>`,
  },
  opioidesRAM: {
    titulo: 'Efectos de los opioides según dónde está el receptor μ',
    html: () => `<table class="tabla"><tbody>
      <tr><td>Bulbo (pre-Bötzinger)</td><td><b>Depresión respiratoria</b> (causa de muerte en sobredosis)</td></tr>
      <tr><td>Área postrema</td><td>Náuseas y vómito</td></tr>
      <tr><td>Núcleo de Edinger-Westphal</td><td>Miosis puntiforme (no hay tolerancia)</td></tr>
      <tr><td>Plexo mientérico</td><td>Estreñimiento (no hay tolerancia)</td></tr>
      <tr><td>Mastocitos (morfina)</td><td>Prurito, rubor, hipotensión por histamina</td></tr>
      <tr><td>Núcleo accumbens</td><td>Euforia, refuerzo, adicción</td></tr>
      <tr><td>Uso crónico</td><td>Tolerancia, dependencia, abstinencia, hiperalgesia</td></tr>
    </tbody></table><p class="nota">Antídoto: <b>naloxona</b> (vigilar renarcotización).</p>`,
  },
  componentes: {
    titulo: 'Componentes de la anestesia general',
    html: () => `<div class="rejilla">
      <div><b>Hipnosis</b>Inconsciencia · propofol, sevoflurano, tiopental, etomidato, ketamina</div>
      <div><b>Amnesia</b>Sin recuerdos · hipnóticos, midazolam</div>
      <div><b>Analgesia</b>Sin dolor · opioides (fentanilo), ketamina, N₂O</div>
      <div><b>Relajación muscular</b>Inmovilidad · rocuronio, succinilcolina; halogenados (médula)</div>
      <div><b>Pérdida de la respuesta refleja</b>Protección autonómica · opioides, profundidad anestésica</div>
      <div><b>Anestesia balanceada</b>Hipnótico + opioide + relajante: cada fármaco a menor dosis.</div>
    </div>
    <p class="nota">Fases clásicas (Guedel, con éter): analgesia → excitación → anestesia quirúrgica → parálisis bulbar.</p>`,
  },
  ideal: {
    titulo: 'Características deseables de un anestésico',
    html: () => `<ul class="ok-lista">
      <li>Inducción de la inconsciencia <b>rápida, suave y controlada</b></li>
      <li>Recuperación <b>rápida y completa</b> de las funciones cognitivas al suspenderlo</li>
      <li><b>Amplio margen de seguridad</b> (índice terapéutico alto)</li>
      <li>Analgesia, amnesia y relajación muscular</li>
      <li>Mínima depresión cardiovascular y respiratoria</li>
      <li>Sin metabolitos tóxicos, no irritante, estable</li>
    </ul>
    <ul class="no-lista"><li>Inducción tardía</li><li>Margen de seguridad estrecho</li><li>Acumulación con dosis repetidas</li></ul>`,
  },
  regional: {
    titulo: 'Anestesia local y regional',
    html: () => `<div class="rejilla">
      <div><b>Local</b>Infiltración de los tejidos donde se hará el procedimiento.</div>
      <div><b>Regional periférica</b>Bloqueo de un nervio o de un plexo (braquial, femoral…).</div>
      <div><b>Regional central (neuroaxial)</b>Raquídea (espacio subaracnoideo) o epidural.</div>
      <div><b>Tópica</b>Mucosas y piel (lidocaína en gel o aerosol).</div>
    </div>
    <table class="tabla"><thead><tr><th>Fármaco</th><th>Tipo</th><th>pKa</th><th>Inicio</th><th>Duración</th></tr></thead><tbody>
      <tr><td>${chip('lidocaina')}</td><td>Amida</td><td class="num">7,9</td><td>Rápido</td><td>Intermedia</td></tr>
      <tr><td>${chip('bupivacaina')}</td><td>Amida</td><td class="num">8,1</td><td>Lento</td><td>Larga</td></tr>
      <tr><td>${chip('procaina')}</td><td>Éster</td><td class="num">8,9</td><td>Lento</td><td>Corta</td></tr>
    </tbody></table>
    <p class="nota">Cuanto más cerca está el pKa de 7,4, más forma no ionizada y más rápido el inicio. La adrenalina prolonga el efecto (vasoconstricción) y reduce la toxicidad sistémica.</p>`,
  },
  cam: {
    titulo: 'Anestésicos inhalados',
    html: () => `<table class="tabla"><thead><tr><th></th><th>CAM</th><th>Sangre/gas</th><th>Metab.</th></tr></thead><tbody>
      <tr><td>${chip('sevoflurano')}</td><td class="num">2,0 %</td><td class="num">0,65</td><td class="num">3-5 %</td></tr>
      <tr><td>${chip('desflurano')}</td><td class="num">6,0 %</td><td class="num">0,42</td><td class="num">0,02 %</td></tr>
      <tr><td>${chip('isoflurano')}</td><td class="num">1,15 %</td><td class="num">1,4</td><td class="num">0,2 %</td></tr>
      <tr><td>${chip('halotano')}</td><td class="num">0,75 %</td><td class="num">2,4</td><td class="num">20 %</td></tr>
      <tr><td>${chip('oxido_nitroso')}</td><td class="num">104 %</td><td class="num">0,47</td><td class="num">~0</td></tr>
    </tbody></table>
    <p class="nota"><b>CAM baja = más potente</b> (más liposoluble, regla de Meyer-Overton). <b>Sangre/gas bajo = más rápido</b>. La CAM baja con la edad, los opioides y la hipotermia; sube con el alcoholismo crónico y la hipertermia.</p>`,
  },
  hipertermia: {
    titulo: 'Hipertermia maligna: protocolo',
    html: () => `<div class="caja" style="border-color:rgba(255,107,107,.5)"><div class="titulo-caja" style="color:#ffb0b0">Reconocer</div>Taquicardia, ↑ EtCO₂ (signo precoz), rigidez (masetero), hipertermia rápida, acidosis mixta, hiperpotasemia, mioglobinuria.</div>
    <ol class="pasos-lista">
      <li><b>Suspender</b> el halogenado y la succinilcolina; pedir ayuda.</li>
      <li><b>Hiperventilar</b> con O₂ al 100 % a flujo alto; cambiar a anestesia IV (propofol).</li>
      <li><b>Dantroleno</b> 2,5 mg/kg IV; repetir hasta controlar (hasta ~10 mg/kg).</li>
      <li>Enfriamiento activo; tratar hiperpotasemia, acidosis y arritmias (no usar bloqueadores de Ca²⁺ con dantroleno).</li>
      <li>Vigilar diuresis y CK; UCI 24-48 h (recurrencias); estudiar al paciente y a la familia (RYR1).</li>
    </ol>
    <div class="rejilla"><div class="destacado"><b>Desencadenantes</b>Sevoflurano, desflurano, isoflurano, halotano, succinilcolina</div><div><b>Seguros</b>Propofol, opioides, BZD, ketamina, N₂O, rocuronio, anestésicos locales</div></div>`,
  },
  continuo: {
    titulo: 'El continuo de la sedación (ASA)',
    html: () => `<table class="tabla"><thead><tr><th>Nivel</th><th>Respuesta</th><th>Vía aérea</th><th>Ventilación</th></tr></thead><tbody>
      <tr><td><b>Mínima</b> (ansiolisis)</td><td>Normal a la voz</td><td>Sin cambios</td><td>Sin cambios</td></tr>
      <tr><td><b>Moderada</b> («consciente»)</td><td>A la voz o al tacto</td><td>No requiere intervención</td><td>Adecuada</td></tr>
      <tr><td><b>Profunda</b></td><td>Solo a estímulos dolorosos repetidos</td><td>Puede requerir intervención</td><td>Puede ser inadecuada</td></tr>
      <tr><td><b>Anestesia general</b></td><td>No responde al dolor</td><td>Suele requerir intervención</td><td>Frecuentemente inadecuada</td></tr>
    </tbody></table>`,
  },
  flipflop: {
    titulo: 'El interruptor sueño-vigilia',
    html: () => `<div class="rejilla">
      <div><b style="color:${NT.GABA.color}">Lado «sueño»</b>VLPO (GABA y galanina) inhibe a los núcleos del despertar.</div>
      <div><b style="color:${NT.NA.color}">Lado «vigilia»</b>Locus coeruleus (NA), rafe (5-HT), tuberomamilar (histamina), PPT/LDT (ACh).</div>
      <div><b style="color:${NT.ORX.color}">Estabilizador</b>Orexina (hipotálamo lateral): mantiene el interruptor en vigilia. Su déficit = narcolepsia.</div>
      <div><b style="color:${NT.MT.color}">Reloj</b>Núcleo supraquiasmático + melatonina: decide <i>cuándo</i>.</div>
    </div>
    <table class="tabla"><tbody>
      <tr><td>Potenciar el lado «sueño»</td><td>${chip('zolpidem')} ${chip('eszopiclona')} ${chip('triazolam')}</td></tr>
      <tr><td>Apagar el lado «vigilia»</td><td>${chip('suvorexant')} ${chip('difenhidramina')} ${chip('doxepina')}</td></tr>
      <tr><td>Ajustar el reloj</td><td>${chip('ramelteon')} ${chip('melatonina')}</td></tr>
    </tbody></table>`,
  },
  subunidades: {
    titulo: 'Subunidades del GABA-A y efectos de las BZD',
    html: () => `<table class="tabla"><thead><tr><th>Subunidad</th><th>Dónde</th><th>Efecto de la BZD</th></tr></thead><tbody>
      <tr><td><b>α1</b></td><td>Corteza, tálamo, cerebelo</td><td>Sedación, amnesia anterógrada, anticonvulsivo (zolpidem: selectivo)</td></tr>
      <tr><td><b>α2 / α3</b></td><td>Amígdala, corteza, médula</td><td>Ansiolisis, relajación muscular</td></tr>
      <tr><td><b>α5</b></td><td>Hipocampo</td><td>Memoria y aprendizaje</td></tr>
      <tr><td><b>α4 / α6</b></td><td>Tálamo, cerebelo</td><td>Insensibles a las BZD clásicas</td></tr>
    </tbody></table>
    <p class="nota">El sitio BZD está entre α y γ2; el GABA se une entre β y α. Composición típica: 2 α + 2 β + 1 γ2.</p>`,
  },
  recomendacionesBZD: {
    titulo: 'Recomendaciones para el uso de benzodiacepinas',
    html: () => `<ul class="ok-lista">
      <li>Usar la <b>menor dosis eficaz</b> durante el <b>menor tiempo posible</b> (2-4 semanas)</li>
      <li><b>Retirada gradual</b> (reducir 10-25 % cada 1-2 semanas): nunca suspender bruscamente</li>
      <li><b>No combinar</b> con alcohol, opioides ni otros depresores del SNC</li>
      <li><b>No conducir</b> ni manejar maquinaria peligrosa</li>
      <li>Precaución en <b>ancianos</b> (caídas, confusión), embarazo, EPOC/apnea y antecedentes de adicción</li>
      <li>Informar sobre <b>tolerancia, dependencia</b> y amnesia</li>
      <li>Asociar psicoterapia y un tratamiento de fondo (ISRS)</li>
    </ul>
    <p class="nota">Antídoto: ${chip('flumazenil')}</p>`,
  },
  frecuenciaDuracion: {
    titulo: 'Frecuencia (BZD) frente a duración (barbitúricos)',
    html: () => `<canvas class="canal-unico" data-canal-unico></canvas>
    <p class="nota">Registro esquemático de un solo canal GABA-A (patch-clamp): cada deflexión hacia abajo es una apertura del canal de Cl⁻.</p>`,
    montar: (raiz) => raiz.querySelectorAll('[data-canal-unico]').forEach(montarCanalUnico),
  },
  barbituricoQuimica: {
    titulo: 'Relación estructura-actividad de los barbitúricos',
    html: () => `<div class="rejilla">
      <div><b>Ácido barbitúrico</b>Urea + ácido malónico. Sin sustituyentes en C5 no es depresor.</div>
      <div><b>Sustituyentes en C5</b>Dos grupos alquilo/arilo: más largos o ramificados → más lipófilo, inicio más rápido, acción más corta.</div>
      <div><b>C2 = S</b>Tiobarbitúricos (tiopental): acción ultracorta.</div>
      <div><b>N-metilación</b>Metohexital: más lipófilo, ultracorto.</div>
      <div><b>5-fenilo</b>Fenobarbital: actividad anticonvulsiva a dosis poco sedantes.</div>
      <div><b>Ácidos débiles</b>pKa 7-8: su ionización (y la alcalinización urinaria) cambian su eliminación.</div>
    </div>
    <table class="tabla"><thead><tr><th>Duración</th><th>Ejemplos</th><th>Uso</th></tr></thead><tbody>
      <tr><td>Ultracorta (min)</td><td>${chip('tiopental')} ${chip('metohexital')}</td><td>Inducción anestésica, TEC</td></tr>
      <tr><td>Corta (3-4 h)</td><td>${chip('pentobarbital')} ${chip('secobarbital')}</td><td>Coma barbitúrico; antes hipnóticos</td></tr>
      <tr><td>Larga (días)</td><td>${chip('fenobarbital')} ${chip('primidona')}</td><td>Epilepsia</td></tr>
    </tbody></table>`,
  },
  tiposCrisis: {
    titulo: 'Tipos de crisis epilépticas (ILAE 2017, simplificado)',
    html: () => `<div class="rejilla">
      <div><b>Focal</b>Empieza en una red de un hemisferio. Con o sin alteración de la conciencia; motora o no motora.</div>
      <div><b>Focal a tónico-clónica bilateral</b>La descarga focal se propaga a ambos hemisferios.</div>
      <div><b>Generalizada tónico-clónica</b>Pérdida de conciencia, rigidez, sacudidas, mordedura de lengua, relajación de esfínteres, confusión postcrítica.</div>
      <div><b>Ausencia</b>Desconexión de segundos, sin caída; punta-onda de 3 Hz (tálamo-cortical).</div>
      <div><b>Mioclónica</b>Sacudidas breves, sin pérdida de conciencia (epilepsia mioclónica juvenil).</div>
      <div><b>Estatus epiléptico</b>Crisis > 5 min o crisis repetidas sin recuperación: urgencia.</div>
    </div>`,
  },
  eleccionAE: {
    titulo: 'Qué antiepiléptico para qué crisis',
    html: () => `<table class="tabla"><thead><tr><th>Crisis</th><th>Primera elección</th><th>Evitar</th></tr></thead><tbody>
      <tr><td>Focal</td><td>${chip('lamotrigina')} ${chip('levetiracetam')} ${chip('carbamazepina')} ${chip('oxcarbazepina')}</td><td>—</td></tr>
      <tr><td>Tónico-clónica generalizada</td><td>${chip('valproato')} (no en mujeres en edad fértil) ${chip('lamotrigina')} ${chip('levetiracetam')}</td><td>—</td></tr>
      <tr><td>Ausencia</td><td>${chip('etosuximida')} ${chip('valproato')}</td><td>Carbamazepina, fenitoína, gabapentina</td></tr>
      <tr><td>Mioclónica</td><td>${chip('valproato')} ${chip('levetiracetam')}</td><td>Carbamazepina, fenitoína</td></tr>
      <tr><td>Estatus</td><td>${chip('lorazepam')} / ${chip('midazolam')} → levetiracetam, fosfenitoína o valproato IV</td><td>—</td></tr>
    </tbody></table>`,
  },
  rangos: {
    titulo: 'Monitorización de concentraciones',
    html: () => `<table class="tabla"><thead><tr><th>Fármaco</th><th>Rango (mg/L)</th><th>Nota</th></tr></thead><tbody>
      <tr><td>${chip('fenitoina')}</td><td class="num">10-20</td><td>No lineal; medir la fracción libre si hay hipoalbuminemia</td></tr>
      <tr><td>${chip('carbamazepina')}</td><td class="num">4-12</td><td>Autoinducción en 3-4 semanas</td></tr>
      <tr><td>${chip('valproato')}</td><td class="num">50-100</td><td>Unión a proteínas saturable</td></tr>
      <tr><td>${chip('fenobarbital')}</td><td class="num">15-40</td><td>t½ de días: estado estable en 2-3 semanas</td></tr>
      <tr><td>${chip('etosuximida')}</td><td class="num">40-100</td><td></td></tr>
      <tr><td>${chip('lamotrigina')}</td><td class="num">3-15</td><td>Orientativo; muy variable en el embarazo</td></tr>
    </tbody></table>`,
  },
  viasDA: {
    titulo: 'Vías dopaminérgicas y bloqueo D2',
    html: () => `<table class="tabla"><thead><tr><th>Vía</th><th>Función</th><th>Bloqueo D2</th></tr></thead><tbody>
      <tr><td><b>Mesolímbica</b><br><small>ATV → accumbens</small></td><td>Recompensa, saliencia</td><td style="color:#3fd69b">↓ síntomas positivos</td></tr>
      <tr><td><b>Mesocortical</b><br><small>ATV → corteza prefrontal</small></td><td>Motivación, cognición</td><td style="color:#ffd24d">Puede empeorar síntomas negativos</td></tr>
      <tr><td><b>Nigroestriada</b><br><small>Sustancia negra → estriado</small></td><td>Movimiento</td><td style="color:#ff6b6b">Síntomas extrapiramidales</td></tr>
      <tr><td><b>Tuberoinfundibular</b><br><small>Arcuato → hipófisis</small></td><td>Inhibe la prolactina</td><td style="color:#ff6b6b">Hiperprolactinemia</td></tr>
    </tbody></table>`,
  },
  ocupacionD2: {
    titulo: 'Ocupación D2 y efecto (estudios PET)',
    html: () => `<div class="bandas"><span style="width:60%;background:#2c3b58;color:#cfe0ff">&lt; 60 %: poco eficaz</span><span style="width:18%;background:#3fd69b">65-78 %</span><span style="width:22%;background:#ff6b6b">&gt; 78 %: SEP</span></div>
    <p class="nota">La hiperprolactinemia aparece desde ≈ 72 %. Kapur S et al., Am J Psychiatry 2000;157:514-20. La clozapina (40-60 %) y el aripiprazol (agonista parcial, > 85 %) son excepciones.</p>`,
  },
  afinidades: {
    titulo: 'Perfil de afinidades (pKi aproximado)',
    html: (ctx) => {
      const ids = ['haloperidol', 'clorpromazina', 'risperidona', 'olanzapina', 'quetiapina', 'clozapina', 'aripiprazol'];
      const sel = ctx?.farmaco && POR_ID[ctx.farmaco]?.afinidad ? ctx.farmaco : 'olanzapina';
      return `${radarSVG([sel, 'haloperidol'].filter((v, i, a) => a.indexOf(v) === i))}
      <div class="chips" style="margin-top:6px">${ids.map(chip).join('')}</div>
      <p class="nota">Más hacia fuera = más afinidad (pKi = −log Ki). D2: efecto antipsicótico y SEP; 5-HT2A: menos SEP; H1: sedación y peso; M1: efectos anticolinérgicos; α1: hipotensión ortostática. Valores redondeados de la PDSP Ki Database; varían entre estudios.</p>`;
    },
  },
};

// ---------------------------------------------------------------------------
export function radarSVG(ids, tam = 320) {
  const ejes = ['D2', '5-HT2A', 'H1', 'M1', 'α1', '5-HT1A'];
  const cx = tam / 2, cy = tam / 2 + 6, R = tam / 2 - 46;
  const colores = ['#ffe7a3', '#ff5ca8', '#4da3ff'];
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / ejes.length;
    const r = R * Math.max(0, (v - 4) / 6);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  let s = `<svg class="radar" viewBox="0 0 ${tam} ${tam + 12}" role="img" aria-label="Perfil de afinidades por receptores">`;
  for (const v of [6, 8, 10]) {
    const p = ejes.map((_, i) => pt(i, v).join(',')).join(' ');
    s += `<polygon points="${p}" fill="none" stroke="#22304a" stroke-width="1"/>`;
  }
  ejes.forEach((e, i) => {
    const [x, y] = pt(i, 10);
    const [lx, ly] = pt(i, 11.1);
    s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#22304a"/><text x="${lx}" y="${ly}" fill="#a3b0c6" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="middle" font-family="Texto, sans-serif">${e}</text>`;
  });
  ids.forEach((id, k) => {
    const af = POR_ID[id]?.afinidad;
    if (!af) return;
    const p = ejes.map((e, i) => pt(i, af[e] ?? 4).join(',')).join(' ');
    const c = colores[k % colores.length];
    s += `<polygon points="${p}" fill="${c}" fill-opacity="${k ? 0.1 : 0.22}" stroke="${c}" stroke-width="2" ${k ? 'stroke-dasharray="5 4"' : ''}/>`;
  });
  ids.forEach((id, k) => {
    s += `<g transform="translate(${10},${16 + k * 18})"><rect width="12" height="4" y="-2" fill="${colores[k % colores.length]}"/><text x="18" y="0" fill="#e6ecf5" font-size="12" dominant-baseline="middle" font-family="Texto, sans-serif">${POR_ID[id]?.nombre || id}</text></g>`;
  });
  return s + '</svg>';
}

// Registro de canal único animado: control, + BZD, + barbitúrico
function montarCanalUnico(canvas) {
  const filas = [
    { t: 'GABA solo', tasa: 3.5, tau: 0.035, color: '#c9d3e6' },
    { t: 'GABA + benzodiacepina → ↑ FRECUENCIA', tasa: 9, tau: 0.035, color: '#ffe7a3' },
    { t: 'GABA + barbitúrico → ↑ DURACIÓN', tasa: 3.5, tau: 0.13, color: '#ffb547' },
  ];
  const rnd = aleatorio(4);
  const ventana = 2.4;
  const eventos = filas.map(() => []);
  let t = 0, ultimo = performance.now();
  const generar = (k, hasta) => {
    const f = filas[k];
    let tt = eventos[k].length ? eventos[k][eventos[k].length - 1].fin : 0;
    while (tt < hasta) {
      tt += -Math.log(1 - rnd()) / f.tasa;
      const dur = -Math.log(1 - rnd()) * f.tau + 0.006;
      eventos[k].push({ ini: tt, fin: tt + dur });
      tt += dur;
    }
  };
  const dibujar = (ahora) => {
    if (!canvas.isConnected) return;
    requestAnimationFrame(dibujar);
    t += Math.min(0.05, (ahora - ultimo) / 1000) * 0.6;
    ultimo = ahora;
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = ajustarLienzo(canvas, r.width, r.height);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a101b';
    ctx.fillRect(0, 0, r.width, r.height);
    const alto = (r.height - 16) / 3;
    filas.forEach((f, k) => {
      generar(k, t + 0.5);
      eventos[k] = eventos[k].filter((e) => e.fin > t - ventana - 0.2);
      const y0 = 10 + k * alto + 20, amp = alto * 0.38;
      rotulo(ctx, f.t, 10, y0 - 12, { tam: 11, color: f.color, alinear: 'left', peso: 700, fuente: FUENTE.texto });
      ctx.beginPath();
      const x = (tt) => 10 + ((tt - (t - ventana)) / ventana) * (r.width - 20);
      ctx.moveTo(10, y0);
      for (const e of eventos[k]) {
        if (e.fin < t - ventana || e.ini > t) continue;
        const a = Math.max(e.ini, t - ventana), b = Math.min(e.fin, t);
        ctx.lineTo(x(a), y0); ctx.lineTo(x(a), y0 + amp); ctx.lineTo(x(b), y0 + amp); ctx.lineTo(x(b), y0);
      }
      ctx.lineTo(r.width - 10, y0);
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });
    rotulo(ctx, 'abierto ↓', r.width - 10, r.height - 8, { tam: 9.5, color: TINTA.tenue, alinear: 'right' });
  };
  requestAnimationFrame(dibujar);
}
