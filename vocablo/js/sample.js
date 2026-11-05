/* Vocablo · mazo de ejemplo: inglés para farmacia (puedes borrarlo cuando quieras) */
(function () {
  'use strict';
  const V = window.V;

  // [palabra, traducción, categoría, IPA (EE. UU.), definición, ejemplo, traducción del ejemplo, nivel, mnemotecnia]
  const WORDS = [
    ['prescription', 'receta (médica)', 'noun', '/prɪˈskrɪpʃən/', 'A written order from a doctor for a medicine.', 'The pharmacist checked the prescription before giving her the pills.', 'El farmacéutico revisó la receta antes de darle las pastillas.', 'B1', 'Pre-scribir: el médico la escribe antes de que compres el fármaco.'],
    ['dosage', 'posología, dosificación', 'noun', '/ˈdoʊsɪdʒ/', 'The amount of a medicine and how often it should be taken.', 'Always follow the dosage printed on the label.', 'Sigue siempre la posología impresa en la etiqueta.', 'B2', 'Dose + -age: todo el plan de dosis, no una sola toma.'],
    ['side effect', 'efecto secundario', 'noun', '/ˈsaɪd ɪˌfekt/', 'An unwanted effect of a drug in addition to the intended one.', 'Drowsiness is a common side effect of this antihistamine.', 'La somnolencia es un efecto secundario común de este antihistamínico.', 'B1', 'Side = lado: el efecto que aparece «de lado».'],
    ['overdose', 'sobredosis', 'noun', '/ˈoʊvərdoʊs/', 'Too much of a drug taken at one time.', 'Naloxone can reverse an opioid overdose in minutes.', 'La naloxona puede revertir una sobredosis de opioides en minutos.', 'B2', 'Over = por encima: una dosis por encima del límite.'],
    ['tablet', 'comprimido, tableta', 'noun', '/ˈtæblət/', 'A small solid piece of medicine that you swallow.', 'Take one tablet twice a day with food.', 'Tome un comprimido dos veces al día con comida.', 'A2', ''],
    ['syringe', 'jeringa', 'noun', '/səˈrɪndʒ/', 'A tube with a needle used to inject liquids into the body.', 'The nurse filled the syringe with insulin.', 'La enfermera llenó la jeringa con insulina.', 'B2', 'Syringe y jeringa vienen del griego sýrinx, «tubo»: casi la misma palabra.'],
    ['swallow', 'tragar', 'verb', '/ˈswɑːloʊ/', 'To make food, drink or a pill go down your throat.', 'Swallow the capsule whole; do not chew it.', 'Trague la cápsula entera; no la mastique.', 'B1', 'También es «golondrina»: el pájaro que se traga los insectos al vuelo.'],
    ['shelf life', 'vida útil', 'noun', '/ˈʃelf ˌlaɪf/', 'The length of time a product stays usable or safe.', 'This vaccine has a short shelf life once it is opened.', 'Esta vacuna tiene una vida útil corta una vez abierta.', 'B2', 'Shelf = estante: cuánto «vive» en el estante.'],
    ['over-the-counter', 'de venta libre (sin receta)', 'adjective', '/ˌoʊvər ðə ˈkaʊntər/', 'Sold without a doctor’s prescription.', 'Ibuprofen is sold over-the-counter in many countries.', 'El ibuprofeno es de venta libre en muchos países.', 'B2', 'Se compra «por encima del mostrador», sin pasar por el médico.'],
    ['bioavailability', 'biodisponibilidad', 'noun', '/ˌbaɪoʊəˌveɪləˈbɪləti/', 'The fraction of a drug that reaches the bloodstream unchanged.', 'Oral morphine has low bioavailability because of the first-pass effect.', 'La morfina oral tiene baja biodisponibilidad por el efecto de primer paso.', 'C1', 'Bio + available + -ity: cuánto fármaco queda «disponible» en la sangre.'],
    ['wear off', 'pasarse (un efecto)', 'phrasal verb', '/ˌwer ˈɔːf/', 'To gradually disappear or stop having an effect.', 'The anesthetic will wear off in a few hours.', 'La anestesia se pasará en unas horas.', 'B2', 'Wear = desgastar: el efecto se desgasta hasta irse (off).'],
    ['compliance', 'adherencia (al tratamiento)', 'noun', '/kəmˈplaɪəns/', 'The degree to which a patient takes a medicine exactly as prescribed.', 'Once-daily dosing improves patient compliance.', 'Una sola toma al día mejora la adherencia del paciente.', 'C1', 'Comply = cumplir: el paciente cumple la pauta.'],
    ['shortage', 'escasez, desabastecimiento', 'noun', '/ˈʃɔːrtɪdʒ/', 'A situation in which there is not enough of something.', 'The hospital is facing a shortage of antibiotics.', 'El hospital se enfrenta a una escasez de antibióticos.', 'B2', 'Short = corto: vamos cortos de algo.'],
    ['taper', 'reducir gradualmente (la dosis)', 'verb', '/ˈteɪpər/', 'To reduce the dose of a drug slowly, step by step.', 'Doctors taper steroids to avoid withdrawal symptoms.', 'Los médicos reducen poco a poco los corticoides para evitar síntomas de abstinencia.', 'C1', 'Un «taper» es una vela fina que se estrecha poco a poco.'],
    ['withdrawal', 'abstinencia; retirada', 'noun', '/wɪðˈdrɔːəl/', 'Unpleasant symptoms that appear when you stop taking a drug your body depends on.', 'Opioid withdrawal can cause sweating, anxiety and muscle pain.', 'La abstinencia de opioides puede causar sudoración, ansiedad y dolor muscular.', 'B2', 'Withdraw = retirar (dinero del banco o un fármaco del cuerpo).'],
    ['thorough', 'minucioso, exhaustivo', 'adjective', '/ˈθɝːoʊ/', 'Done carefully and completely, paying attention to every detail.', 'We need a thorough review of the patient’s medications.', 'Necesitamos una revisión minuciosa de la medicación del paciente.', 'B2', 'Se parece a «through» (de principio a fin): revisar algo de cabo a rabo.'],
    ['likely', 'probable', 'adjective', '/ˈlaɪkli/', 'Probably going to happen or be true.', 'Nausea is likely during the first week of treatment.', 'Las náuseas son probables durante la primera semana de tratamiento.', 'B1', ''],
    ['wane', 'disminuir, menguar', 'verb', '/weɪn/', 'To become gradually weaker or smaller.', 'Immunity may wane a few months after vaccination.', 'La inmunidad puede disminuir unos meses después de la vacunación.', 'C1', 'Como la luna menguante: «waning moon».'],
    ['outpatient', 'paciente ambulatorio', 'noun', '/ˈaʊtˌpeɪʃənt/', 'A patient who receives treatment without staying in the hospital.', 'She was treated as an outpatient and went home the same day.', 'La atendieron de forma ambulatoria y se fue a casa el mismo día.', 'B2', 'Out = fuera: el paciente que duerme fuera del hospital.'],
    ['outcome', 'resultado, desenlace', 'noun', '/ˈaʊtkʌm/', 'The final result of an action, process or treatment.', 'The study measured the clinical outcome after six months.', 'El estudio midió el desenlace clínico a los seis meses.', 'B2', 'Lo que «sale» (comes out) al final.'],
  ];

  V.loadSampleDeck = () => {
    const meta = V.state.meta;
    let deck = meta.decks.find((d) => d.sample);
    if (!deck) {
      deck = { id: 'd' + V.uid(), name: 'Inglés farmacéutico (ejemplo)', color: 1, createdAt: Date.now(), sample: true };
      meta.decks.push(deck);
      V.saveMeta();
    }
    const base = Date.now();
    let added = 0;
    WORDS.forEach((w, i) => {
      if (V.findDuplicate(w[0])) return;
      const note = V.createNote(
        {
          word: w[0],
          translation: w[1],
          pos: w[2],
          ipa: w[3],
          definition: w[4],
          example: w[5],
          exampleTr: w[6],
          level: w[7],
          mnemonic: w[8],
          tags: ['ejemplo', 'farmacia'],
        },
        deck.id,
        V.settings().cardKinds
      );
      note.createdAt = base + i;
      V.saveNote(note);
      added++;
    });
    return added;
  };
})();
