/* Preguntas rápidas (estilo examen oral, parte 1): [pregunta, respuesta modelo, frases útiles] */
const QUICK_QUESTIONS = [
['What do you study, and why did you choose it?','I study pharmaceutical chemistry. I chose it because I love chemistry and I want to work in health.','I chose it because… · I\'ve always been interested in…'],
['Describe your typical day.','I usually wake up at six, I have classes in the morning, and in the afternoon I study at the library.','I usually… · After that… · In the afternoon…'],
['What did you do last weekend?','Last weekend I visited my family and I studied for a biochemistry exam.','Last weekend I… · On Saturday… · On Sunday…'],
['Do you prefer studying alone or in a group? Why?','I prefer studying alone because I can concentrate better, but before exams I like to study in a group.','I prefer… because… · It depends on…'],
['What is your favorite subject at university?','My favorite subject is pharmacology, because I like to understand how drugs work in the body.','My favorite subject is… · I find it… interesting'],
['Where do you live? Describe your neighborhood.','I live in a quiet neighborhood near the university. There are some shops and a small park.','I live in… · There is / There are…'],
['How do you usually get to the university?','I usually take the bus. It takes about forty minutes.','I usually take… · It takes about…'],
['What do you do when you feel stressed?','When I feel stressed, I go for a walk or I listen to music.','When I feel…, I… · It helps me…'],
['What are your plans for next year?','Next year I\'m going to start my internship, and I want to improve my English.','I\'m going to… · I\'d like to…'],
['Have you ever been to another country?','No, I haven\'t, but I\'d love to visit Canada one day.','I\'ve never… · I\'d love to…'],
['Do you think English is important for pharmacists? Why?','Yes, I do. Most scientific papers are in English, and many companies work internationally.','I think so, because… · For example…'],
['What would you like to do after you graduate?','I\'d like to work in a hospital as a clinical pharmacist, or in quality control.','I\'d like to… · My dream is to…'],
['Describe a medicine that you know well.','I know ibuprofen well. It\'s used for pain and inflammation, and it\'s better to take it with food.','It\'s used for… · You should… · A common side effect is…'],
['What do you do to stay healthy?','I try to sleep eight hours, I walk a lot, and I don\'t eat much fast food.','I try to… · I don\'t… much'],
['What is the best way to learn new vocabulary, in your opinion?','In my opinion, the best way is to review words several times, with spaces between reviews, and to use them when you speak.','In my opinion… · The best way is to…'],
['Tell me about a teacher who helped you.','My chemistry teacher in high school helped me a lot. She explained everything clearly and she believed in me.','He/She helped me… · He/She always…']
];

/* Tarjetas para la técnica 4/3/2 (misma charla, cada vez en menos tiempo) */
const CUE_CARDS = [
{id:'c-medicine', title:'A medicine you know well', points:['What it is used for','How people take it','What side effects it can have','Why you know it']},
{id:'c-practical', title:'A lab practical you remember', points:['What you did','What equipment you used','What happened','What you learned']},
{id:'c-teacher', title:'A teacher who helped you', points:['Who the teacher was','What subject they taught','How they helped you','Why you remember them']},
{id:'c-future', title:'Your plans for the future', points:['Where you want to work','What you need to do first','Why this job interests you','How English will help you']},
{id:'c-place', title:'A place where you like to study', points:['Where it is','What it looks like','When you go there','Why you like it']},
{id:'c-patient', title:'Explain to a patient how to take an antibiotic', points:['How many times a day','With or without food','What to avoid','When to call a doctor']},
{id:'c-sick', title:'A time you helped someone who was sick', points:['Who the person was','What the problem was','What you did','How the person felt after']},
{id:'c-hometown', title:'Your hometown', points:['Where it is','What it is famous for','What you like and dislike','Whether you would like to live there in the future']}
];

/* Conversaciones con IA (juego de roles) */
const ROLEPLAYS = [
{id:'rp-counter', title:'En la farmacia: tú atiendes', ai:'a customer at a pharmacy who has had a cold for two days (runny nose, sore throat, mild fever) and wants something to feel better', user:'the pharmacist', goal:'Haz preguntas (síntomas, alergias, otros medicamentos) y da instrucciones claras de dosis.', opener:'Hi… I have a terrible cold. Can you recommend something?'},
{id:'rp-customer', title:'En la farmacia: tú eres el cliente', ai:'a friendly pharmacist', user:'a customer with a headache who wants a painkiller', goal:'Explica tus síntomas y pregunta cómo tomar el medicamento.', opener:'Good afternoon! How can I help you today?'},
{id:'rp-exchange', title:'Compañero de intercambio', ai:'Daniel, a friendly exchange student from Canada who studies pharmacy and wants to make friends', user:'a local pharmacy student', goal:'Charla informal: presentarte, tu carrera, tus planes, tu ciudad.', opener:'Hey! I\'m Daniel. Are you in the pharmacology class too?'},
{id:'rp-interview', title:'Entrevista de trabajo', ai:'an interviewer at a pharmaceutical company hiring an intern for the quality control laboratory', user:'a final-year pharmaceutical chemistry student applying for the internship', goal:'Responde sobre tu experiencia, tus fortalezas y por qué quieres el puesto.', opener:'Thanks for coming today. To start, can you tell me a little about yourself?'},
{id:'rp-exam', title:'Examen oral (estilo parte 1)', ai:'a calm, professional English speaking examiner doing part 1 of an oral exam (short questions about home, studies, hobbies and daily life). Ask one question at a time. After 8 questions, end the test politely.', user:'the candidate', goal:'Responde con 2–3 frases cada vez: idea + razón + ejemplo.', opener:'Good morning. My name is Ms Carter. Can you tell me your full name, please?'},
{id:'rp-explain', title:'Explica un mecanismo', ai:'a curious first-year student who knows nothing about pharmacology and asks simple follow-up questions', user:'a senior pharmacy student explaining how a drug works (for example ibuprofen or morphine)', goal:'Explica con palabras simples cómo funciona un fármaco. Es el mejor ejercicio para tu examen oral.', opener:'Hi! Can you explain to me how painkillers actually work? I have no idea.'}
];

/* Tareas de escritura */
const WRITING_PROMPTS = [
{id:'w-email', level:'A2', title:'Correo a tu profesor/a', task:'Write an email to your professor. Ask for a meeting to talk about your lab report. Say when you are available.', words:'60–90', chunks:['Dear Professor …,','I am writing to ask…','Would it be possible to…?','I am available on…','Best regards,']},
{id:'w-routine', level:'A2', title:'Tu rutina', task:'Describe your typical day as a student. Use the present simple and words like usually, often, never.', words:'60–90', chunks:['I usually…','After that,…','In the afternoon…','I never…']},
{id:'w-practical', level:'A2', title:'Una práctica de laboratorio', task:'Describe a lab practical you did. What did you do first, next and finally? What happened? Use the past simple.', words:'80–100', chunks:['First, we…','Then,…','Finally,…','The result was…']},
{id:'w-patient', level:'A2', title:'Instrucciones a un paciente', task:'Write instructions for a patient who must take an antibiotic: how often, with or without food, what to avoid and when to call a doctor.', words:'60–90', chunks:['Take one capsule…','You should…','Don\'t…','If you…, call your doctor.']},
{id:'w-intro', level:'A2', title:'Preséntate a un estudiante de intercambio', task:'Write a message to a new exchange student. Introduce yourself, your degree and your hobbies, and invite them to do something together.', words:'60–90', chunks:['Hi …! My name is…','I\'m studying…','In my free time…','Would you like to…?']},
{id:'w-opinion', level:'B1', title:'Opinión: antibióticos sin receta', task:'Should pharmacies sell antibiotics without a prescription? Give your opinion with two reasons and an example.', words:'120–150', chunks:['In my opinion,…','Firstly,…','Secondly,…','For example,…','To sum up,…']},
{id:'w-summary', level:'B1', title:'Resume un artículo', task:'Summarize a scientific text you read recently (or the abstract in the Reading section): aim, methods, main result and conclusion.', words:'100–130', chunks:['The aim of the study was to…','The authors…','The main finding was that…','The authors conclude that…']},
{id:'w-motivation', level:'B1', title:'Carta de motivación corta', task:'Write a short motivation letter for an internship in a quality control laboratory.', words:'120–150', chunks:['I am writing to apply for…','During my degree, I have…','I am particularly interested in…','I would welcome the opportunity to…']}
];
