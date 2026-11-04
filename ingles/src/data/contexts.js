/* Contextos de práctica: día a día, trabajo y entrevistas, ciencia y farmacia.
   Este archivo añade contenido para comunicarse y conseguir trabajo, y etiqueta todo el contenido con su contexto. */
const CTX = { diario: 'Día a día', trabajo: 'Trabajo y empleo', farma: 'Ciencia y farmacia' };
const CTX_ORDER = ['diario', 'trabajo', 'farma'];

/* ---------- Vocabulario ---------- */
const VOCAB_CTX = { frase: 'diario', basico: 'diario', cuerpo: 'diario', falso: 'diario', farma: 'farma', lab: 'farma', academico: 'farma' };
VOCAB.forEach(g => { g.ctx = g.ctx || VOCAB_CTX[g.tag] || 'diario'; });
VOCAB.push(
{tag:'diario', ctx:'diario', label:'Día a día', items:[
[1,"Excuse me, …","Disculpe, … (para llamar la atención)","Excuse me, where is the bathroom?","Disculpe, ¿dónde está el baño?","Excuse me sirve para interrumpir o pedir algo; sorry, para disculparte por un error."],
[1,"How much is it?","¿Cuánto cuesta?","How much is this jacket? — It's forty dollars.","¿Cuánto cuesta esta chaqueta? — Cuesta cuarenta dólares.",""],
[1,"Can I pay by card?","¿Puedo pagar con tarjeta?","Can I pay by card, or only in cash?","¿Puedo pagar con tarjeta o solo en efectivo?","by card, in cash."],
[1,"Can I have …, please?","¿Me da …, por favor?","Can I have a medium latte, please?","¿Me da un latte mediano, por favor?","Es la forma más común de pedir en una tienda o cafetería. «I want…» suena brusco."],
[1,"Where is the nearest …?","¿Dónde está el/la … más cercano/a?","Where is the nearest bus stop?","¿Dónde está la parada de bus más cercana?",""],
[1,"turn left / turn right","gira a la izquierda / a la derecha","Turn left at the bank, and it's on your right.","Gira a la izquierda en el banco y está a tu derecha.",""],
[1,"go straight","sigue derecho","Go straight for two blocks.","Sigue derecho dos cuadras.","block = cuadra."],
[1,"the check / the bill","la cuenta","Could we have the check, please?","¿Nos trae la cuenta, por favor?","check en EE. UU., bill en Reino Unido."],
[1,"to be late","llegar tarde","Sorry I'm late. The traffic was terrible.","Perdón por llegar tarde. El tráfico estaba terrible.","Para disculparte se usa be: «Sorry I'm late»."],
[1,"How's it going?","¿Qué tal? ¿Cómo va todo?","Hey, how's it going? — Pretty good, thanks. And you?","Hola, ¿qué tal? — Bastante bien, gracias. ¿Y tú?",""],
[1,"What do you do?","¿A qué te dedicas?","What do you do? — I'm a student, and I work part-time.","¿A qué te dedicas? — Soy estudiante y trabajo medio tiempo.","Pregunta por tu trabajo u ocupación, no por lo que haces en este momento («What are you doing?»)."],
[1,"Where are you from?","¿De dónde eres?","Where are you from? — I'm from Colombia.","¿De dónde eres? — Soy de Colombia.",""],
[2,"I'm lost.","Estoy perdido/a.","Excuse me, I'm lost. Is this the way to the station?","Disculpe, estoy perdido. ¿Por aquí se va a la estación?",""],
[2,"Is this seat taken?","¿Está ocupado este asiento?","Excuse me, is this seat taken? — No, go ahead.","Disculpe, ¿está ocupado este asiento? — No, adelante.",""],
[2,"to book","reservar","I'd like to book a table for two at eight.","Quisiera reservar una mesa para dos a las ocho.","También: make a reservation."],
[2,"to get on / to get off","subirse / bajarse (del bus, del tren)","Get off at the third stop.","Bájate en la tercera parada.",""],
[2,"change","cambio (dinero)","Here's your change.","Aquí está su cambio.",""],
[2,"to hang out","pasar el rato","Do you want to hang out after work?","¿Quieres que pasemos el rato después del trabajo?","Informal."],
[2,"to catch up","ponerse al día","Let's have coffee and catch up.","Tomemos un café y nos ponemos al día.",""],
[2,"to look forward to","esperar con ganas","I look forward to meeting you.","Espero con ganas conocerte.","Después va -ing o un sustantivo: look forward to meetING."],
[2,"I'm afraid …","Me temo que …","I'm afraid I can't come tomorrow.","Me temo que no puedo ir mañana.","Forma educada de dar una mala noticia o de decir que no."],
[2,"No worries.","No te preocupes.","Sorry for the delay. — No worries!","Perdón por la demora. — ¡No te preocupes!",""],
[2,"to run out of","quedarse sin","We ran out of milk.","Nos quedamos sin leche.",""],
[2,"to figure out","entender; resolver","I can't figure out this form.","No logro entender este formulario.",""]
]},
{tag:'trabajo', ctx:'trabajo', label:'Trabajo', items:[
[1,"job","trabajo; empleo","I'm looking for a job in customer service.","Estoy buscando trabajo en atención al cliente.","job = un empleo concreto; work = el trabajo en general (incontable)."],
[1,"company","empresa","She works for a big company.","Ella trabaja para una empresa grande.","work FOR a company; work AT a place."],
[1,"manager","jefe/a; gerente","My manager is very supportive.","Mi jefa me apoya mucho.","boss es más coloquial."],
[1,"coworker","compañero/a de trabajo","My coworkers are very friendly.","Mis compañeros de trabajo son muy amables.","Más formal: colleague /ˈkɑːliːɡ/."],
[1,"full-time / part-time","tiempo completo / medio tiempo","I want a part-time job while I study.","Quiero un trabajo de medio tiempo mientras estudio.",""],
[1,"meeting","reunión","We have a team meeting every Monday.","Tenemos reunión de equipo todos los lunes.",""],
[1,"to apply for","postularse a; aplicar a","I applied for a job at a hospital.","Me postulé a un trabajo en un hospital.","apply FOR a job; apply TO a company."],
[1,"resume","hoja de vida; currículum","Please send your resume by email.","Por favor envíe su hoja de vida por correo.","En EE. UU. resume /ˈrezəmeɪ/; en Reino Unido, CV.","/ˈrezəmeɪ/"],
[1,"job interview","entrevista de trabajo","I have a job interview tomorrow.","Mañana tengo una entrevista de trabajo.",""],
[1,"experience","experiencia","Do you have experience in customer service?","¿Tienes experiencia en atención al cliente?","Incontable en este sentido: a lot of experience, nunca «experiences».","/ɪkˈspɪriəns/"],
[1,"skills","habilidades","Communication skills are very important.","Las habilidades de comunicación son muy importantes.",""],
[1,"salary","salario; sueldo","What is the salary for this position?","¿Cuál es el salario de este cargo?",""],
[2,"position","cargo; puesto","I'm interested in the assistant position.","Me interesa el cargo de asistente.","Sinónimo: role."],
[2,"requirements","requisitos","One of the requirements is intermediate English.","Uno de los requisitos es inglés intermedio.",""],
[2,"cover letter","carta de presentación","Write a short cover letter for each job.","Escribe una carta de presentación corta para cada trabajo.",""],
[2,"strengths and weaknesses","fortalezas y debilidades","What are your main strengths?","¿Cuáles son tus principales fortalezas?",""],
[2,"I'm a fast learner.","Aprendo rápido.","I don't have much experience, but I'm a fast learner.","No tengo mucha experiencia, pero aprendo rápido.",""],
[2,"I work well in a team.","Trabajo bien en equipo.","I work well in a team, and I also like to take initiative.","Trabajo bien en equipo y también me gusta tomar la iniciativa.",""],
[2,"I'm available to start …","Puedo empezar …","I'm available to start next Monday.","Puedo empezar el próximo lunes.",""],
[2,"Could you tell me more about the position?","¿Podría contarme más sobre el cargo?","Could you tell me more about the position and the team?","¿Podría contarme más sobre el cargo y el equipo?","Pregunta indirecta: el verbo va después del sujeto."],
[2,"What are the next steps?","¿Cuáles son los siguientes pasos?","Thank you for your time. What are the next steps?","Gracias por su tiempo. ¿Cuáles son los siguientes pasos?","Buena pregunta para cerrar una entrevista."],
[2,"deadline","fecha límite; plazo","The deadline for the report is Friday.","El plazo del informe es el viernes.",""],
[2,"shift","turno","I work the night shift on weekends.","Trabajo el turno de noche los fines de semana.",""],
[2,"to hire","contratar","They want to hire two new assistants.","Quieren contratar a dos asistentes nuevos.","to be hired = ser contratado."],
[2,"contract","contrato","It's a six-month contract.","Es un contrato de seis meses.",""],
[2,"customer","cliente","The customer wants a refund.","El cliente quiere un reembolso.","customer = compra en una tienda; client = recibe un servicio profesional."],
[2,"refund","reembolso","You can ask for a refund within 30 days.","Puedes pedir un reembolso dentro de 30 días.",""],
[2,"to handle","manejar; encargarse de","I can handle difficult customers.","Sé manejar clientes difíciles.",""],
[2,"to be in charge of","estar a cargo de","I was in charge of the inventory.","Estaba a cargo del inventario.",""],
[2,"internship","práctica profesional; pasantía","I did a three-month internship.","Hice una práctica de tres meses.",""],
[2,"I'll get back to you.","Te confirmo luego.","Let me check my schedule and I'll get back to you.","Déjame revisar mi agenda y te confirmo.",""],
[2,"I'm calling about …","Llamo por …","Hello, I'm calling about the job advertisement.","Hola, llamo por el anuncio de trabajo.",""],
[2,"Sorry for the delay.","Perdón por la demora.","Sorry for the delay in my reply.","Perdón por la demora en responder.",""],
[2,"I'm sorry about that.","Lamento lo sucedido.","I'm sorry about that. Let me fix it for you.","Lamento lo sucedido. Déjeme solucionarlo.","Frase clave de atención al cliente."],
[3,"to follow up","hacer seguimiento","I'm writing to follow up on my application.","Le escribo para hacer seguimiento a mi postulación.",""],
[3,"to meet a deadline","cumplir un plazo","We worked late to meet the deadline.","Trabajamos hasta tarde para cumplir el plazo.",""],
[3,"to work under pressure","trabajar bajo presión","I can work under pressure and stay organized.","Puedo trabajar bajo presión y mantenerme organizado.",""],
[3,"remote work","trabajo remoto","Remote work saves time, but it can feel lonely.","El trabajo remoto ahorra tiempo, pero puede ser solitario.",""],
[3,"to be promoted","ser ascendido/a","She was promoted to team leader.","La ascendieron a líder de equipo.",""],
[3,"benefits","prestaciones; beneficios","The job includes health insurance and other benefits.","El trabajo incluye seguro médico y otras prestaciones.",""]
]});

/* ---------- Diálogos ---------- */
const DIALOGUE_CTX = { 'd-pharmacy': 'farma', 'd-lab': 'farma', 'd-exchange': 'diario', 'd-drug': 'farma', 'd-phone': 'diario', 'd-antibiotic': 'farma', 'd-adme': 'farma', 'd-interview': 'trabajo', 'd-results': 'farma', 'd-group': 'diario' };
DIALOGUES.forEach(d => { d.ctx = d.ctx || DIALOGUE_CTX[d.id] || 'diario'; });
DIALOGUES.push(
{id:'d-cafe', ctx:'diario', title:'Ordering at a café', level:'A1–A2', topic:'Cafetería',
 context:'Alguien pide algo para llevar en una cafetería. Fíjate en qué pide, cuánto paga y cómo paga.',
 roles:{A:'Barista', B:'Customer'},
 keys:[['to go','para llevar'],['no added sugar','sin azúcar añadida'],['in total','en total'],['to tap your card','acercar la tarjeta']],
 lines:[
 ['A','Hi there! What can I get you?'],
 ['B','Hi. Can I have a medium latte, please?'],
 ['A','Sure. For here or to go?'],
 ['B','To go, please. And do you have anything without sugar?'],
 ['A','Yes, we have an oat muffin with no added sugar.'],
 ['B','Great, I\'ll take one. How much is it?'],
 ['A','That\'s eight fifty in total.'],
 ['B','Can I pay by card?'],
 ['A','Of course. Just tap your card here. What\'s your name for the order?'],
 ['B','It\'s Andrés. A, N, D, R, E, S.'],
 ['A','Thanks, Andrés. Your order will be ready in a few minutes.']],
 q:[['What does the customer order to drink?',['A small coffee','A medium latte','A large tea'],1],
    ['Is the order for here or to go?',['For here','To go','We don\'t know'],1],
    ['What food does the customer buy?',['An oat muffin','A sandwich','A cookie'],0],
    ['How much is the total?',['$8.15','$8.50','$18.50'],1],
    ['How does the customer pay?',['In cash','By card','By phone'],1]],
 dict:[1,6],
 note:'«Can I have…?» es la forma más natural de pedir. «Eight fifty» = 8,50: con dinero se omite «dollars and … cents».'},

{id:'d-interview-gen', ctx:'trabajo', title:'Job interview: tell me about yourself', level:'A2', topic:'Entrevista',
 context:'Una entrevista para un trabajo de atención al cliente. Fíjate en la experiencia de Laura, su fortaleza y cómo responde a la pregunta por su debilidad.',
 roles:{A:'Interviewer', B:'Laura'},
 keys:[['work experience','experiencia laboral'],['to be in charge of','estar a cargo de'],['to stay calm','mantener la calma'],['a to-do list','una lista de tareas']],
 lines:[
 ['A','Good morning, Laura. Please have a seat. Can you tell me a little about yourself?'],
 ['B','Sure. I\'m twenty-two, and I\'m in my last year at university. I\'m organized, I\'m a fast learner, and I like working with people.'],
 ['A','Do you have any work experience?'],
 ['B','Yes. I worked part-time at a supermarket for two years. I helped customers, and I was in charge of the inventory on weekends.'],
 ['A','What is your greatest strength?'],
 ['B','I think it\'s communication. I can explain things clearly, and I stay calm with difficult customers.'],
 ['A','And a weakness?'],
 ['B','Sometimes I spend too much time on details. Now I use a to-do list, and I set a time limit for each task.'],
 ['A','Why do you want this job?'],
 ['B','Because I want to grow in a company with international clients, and I want to use my English every day.'],
 ['A','Great. Do you have any questions for me?'],
 ['B','Yes. What are the next steps in the process?'],
 ['A','We\'ll call you next week for a second interview.']],
 q:[['Where did Laura work before?',['At a supermarket','At a bank','At a hospital'],0],
    ['What was she in charge of on weekends?',['The money','The inventory','New employees'],1],
    ['What is her greatest strength?',['Speed','Communication','Computer skills'],1],
    ['How does she manage her weakness?',['She works longer hours','She uses a to-do list and time limits','She asks her manager'],1],
    ['What is the next step?',['A test online','A call next week for a second interview','She starts on Monday'],1]],
 dict:[3,7],
 note:'Estructura útil para «Tell me about yourself»: presente (quién eres) → pasado (experiencia) → futuro (por qué este trabajo). Entre 60 y 90 segundos.'},

{id:'d-directions', ctx:'diario', title:'Asking for directions', level:'A2', topic:'Ciudad',
 context:'Una persona perdida pregunta cómo llegar a un museo. Atención a las direcciones y los números.',
 roles:{A:'Visitor', B:'Local'},
 keys:[['to bother','molestar'],['block','cuadra'],['traffic lights','semáforo'],['on foot','a pie']],
 lines:[
 ['A','Excuse me, sorry to bother you. I\'m looking for the City Museum.'],
 ['B','Sure. Go straight down this street for two blocks.'],
 ['A','Two blocks. And then?'],
 ['B','At the traffic lights, turn right. The museum is on your left, next to a big park.'],
 ['A','Is it far? Can I walk there?'],
 ['B','Yes, it\'s about ten minutes on foot. Or you can take the number twelve bus.'],
 ['A','I think I\'ll walk. Thank you so much!'],
 ['B','No problem. Enjoy the museum!']],
 q:[['How many blocks should the visitor go straight?',['One','Two','Three'],1],
    ['Where should the visitor turn right?',['At the bank','At the traffic lights','At the park'],1],
    ['Where is the museum?',['On the left, next to a park','On the right, next to a bank','Behind the station'],0],
    ['How long does it take on foot?',['Five minutes','Ten minutes','Twenty minutes'],1],
    ['Which bus can the visitor take?',['Number two','Number twelve','Number twenty'],1]],
 dict:[1,3],
 note:'Repetir lo que te dicen («Two blocks. And then?») es una estrategia excelente: confirmas que entendiste y ganas tiempo.'},

{id:'d-smalltalk', ctx:'trabajo', title:'Small talk on the first day', level:'A2', topic:'Trabajo',
 context:'Primer día en un trabajo nuevo. Un compañero inicia una conversación ligera (small talk).',
 roles:{A:'Mike', B:'Sara'},
 keys:[['so far','hasta ahora'],['to be used to','estar acostumbrado a'],['by the way','por cierto'],['around the corner','a la vuelta de la esquina']],
 lines:[
 ['A','Hi, you must be the new assistant. I\'m Mike, from the sales team.'],
 ['B','Hi Mike, nice to meet you. I\'m Sara. Yes, today is my first day.'],
 ['A','Welcome! How\'s it going so far?'],
 ['B','Pretty good, thanks. Everyone is very friendly, but there\'s a lot to learn.'],
 ['A','Don\'t worry, it gets easier. Where did you work before?'],
 ['B','I worked at a call center for a year, so I\'m used to talking with customers.'],
 ['A','That\'s great experience. By the way, are you coming to lunch with us? We usually go at one.'],
 ['B','I\'d love to. Where do you usually go?'],
 ['A','There\'s a nice little place around the corner. The soup is really good.'],
 ['B','Sounds perfect. See you at one, then.']],
 q:[['Which team is Mike on?',['Sales','Marketing','IT'],0],
    ['Where did Sara work before?',['At a school','At a call center','At a restaurant'],1],
    ['How long did she work there?',['Six months','One year','Two years'],1],
    ['What time do they usually go to lunch?',['At twelve','At one','At two'],1],
    ['Where is the restaurant?',['Around the corner','Downtown','In the building'],0]],
 dict:[3,6],
 note:'«be used to + -ing» = estar acostumbrado a: «I\'m used to talking», no «I\'m used to talk».'},

{id:'d-customer', ctx:'trabajo', title:'Customer service: a wrong order', level:'A2–B1', topic:'Atención al cliente',
 context:'Un cliente llama porque recibió un producto equivocado. Fíjate en las frases del agente: sirven para cualquier trabajo con clientes.',
 roles:{A:'Agent', B:'Customer'},
 keys:[['order number','número de pedido'],['I apologize for…','me disculpo por…'],['to return','devolver'],['business days','días hábiles']],
 lines:[
 ['A','Thank you for calling. My name is Alex. How can I help you today?'],
 ['B','Hi. I ordered a pair of headphones last week, but I received the wrong color.'],
 ['A','I\'m sorry about that. Can I have your order number, please?'],
 ['B','Yes, it\'s B, K, seven, four, two, zero.'],
 ['A','Thank you. I can see the order. You ordered black, and we sent white. Is that right?'],
 ['B','Exactly.'],
 ['A','I apologize for the mistake. We can send you the black ones today, and you can return the white ones for free.'],
 ['B','That\'s great. How long will the delivery take?'],
 ['A','Two to three business days. You\'ll receive an email with the return label.'],
 ['B','Perfect. Thank you for your help.'],
 ['A','You\'re welcome. Is there anything else I can help you with?'],
 ['B','No, that\'s all. Have a nice day!']],
 q:[['What is the problem?',['The headphones don\'t work','The color is wrong','The package is late'],1],
    ['What is the order number?',['BK7420','BK4720','PK7420'],0],
    ['Which color did the customer order?',['White','Black','Blue'],1],
    ['What is the solution?',['A refund only','They send black ones today, and the return is free','The customer must pay for a new pair'],1],
    ['How long will the delivery take?',['One day','Two to three business days','One week'],1]],
 dict:[2,6],
 note:'Frases de oro para atención al cliente: «I\'m sorry about that», «I apologize for the mistake», «Is there anything else I can help you with?».'},

{id:'d-followup', ctx:'trabajo', title:'Calling to follow up', level:'A2–B1', topic:'Búsqueda de empleo',
 context:'Una candidata llama para hacer seguimiento a su postulación. Atención a fechas y al consejo final.',
 roles:{A:'Receptionist', B:'Camila'},
 keys:[['application','postulación'],['to review','revisar'],['to schedule','programar'],['spam folder','carpeta de correo no deseado']],
 lines:[
 ['A','Good afternoon, BrightPath Logistics. How can I help you?'],
 ['B','Hello, my name is Camila Ríos. I\'m calling about the customer service position.'],
 ['A','Of course. Did you send your application?'],
 ['B','Yes, I sent my resume and cover letter last Tuesday, and I wanted to follow up.'],
 ['A','Let me check. Yes, here it is. The team is still reviewing applications.'],
 ['B','Thank you. Do you know when they will contact the candidates?'],
 ['A','They\'re planning to schedule interviews at the end of next week.'],
 ['B','Perfect. Is there anything else I should send?'],
 ['A','Not at the moment, but please check your email, including the spam folder.'],
 ['B','I will. Thank you very much for your help.'],
 ['A','You\'re welcome. Good luck, Camila!']],
 q:[['Which position did Camila apply for?',['Customer service','Sales','Logistics manager'],0],
    ['When did she send her application?',['Last Monday','Last Tuesday','Last Thursday'],1],
    ['What is the team doing now?',['Interviewing','Reviewing applications','Hiring'],1],
    ['When will they schedule interviews?',['Tomorrow','At the end of next week','Next month'],1],
    ['What does the receptionist recommend?',['Send a new resume','Check her email, including spam','Call again tomorrow'],1]],
 dict:[3,6],
 note:'«Do you know when they will contact…?» es una pregunta indirecta: después de «when» va sujeto + verbo, no «when will they».'},

{id:'d-videocall', ctx:'trabajo', title:'Video call: team update', level:'B1', topic:'Reuniones',
 context:'Reunión semanal por videollamada. Mateo debe dar un reporte de su proyecto.',
 roles:{A:'Priya', B:'Mateo'},
 keys:[['on mute','silenciado'],['update','reporte; actualización'],['to deliver','entregar'],['slides','diapositivas']],
 lines:[
 ['A','Hi everyone, can you hear me? Mateo, you\'re on mute.'],
 ['B','Sorry about that. Can you hear me now?'],
 ['A','Yes, perfect. Let\'s start. Mateo, can you give us a quick update on the project?'],
 ['B','Sure. We finished the first part on Monday. The second part is taking longer than we expected.'],
 ['A','What\'s the problem?'],
 ['B','We\'re waiting for some data from another team. Without it, we can\'t finish the report.'],
 ['A','I see. When do you think you can deliver it?'],
 ['B','If we get the data tomorrow, we can finish by Thursday.'],
 ['A','Okay. I\'ll talk to the other team after this call. Is there anything else?'],
 ['B','Just one thing: could you send me the slides from last week\'s meeting?'],
 ['A','Of course. I\'ll send them right after the call. Thanks, everyone!']],
 q:[['What is Mateo\'s first problem in the call?',['His camera is off','He is on mute','He is late'],1],
    ['When did they finish the first part?',['On Monday','On Tuesday','Yesterday'],0],
    ['Why is the second part delayed?',['They are waiting for data from another team','Mateo was sick','The computer broke'],0],
    ['When can they finish?',['Tomorrow','By Thursday, if they get the data','Next week'],1],
    ['What will Priya send?',['The data','The report','The slides from last week'],2]],
 dict:[3,7],
 note:'Estructura de un buen reporte: qué terminaste → qué falta → qué problema hay → cuándo entregas.'}
);

/* ---------- Lecturas ---------- */
const READING_CTX = { 'r-day': 'farma', 'r-paracetamol': 'farma', 'r-antibiotics': 'farma', 'r-adme': 'farma', 'r-abstract': 'farma', 'r-safety': 'farma' };
READINGS.forEach(r => { r.ctx = r.ctx || READING_CTX[r.id] || 'diario'; });
READINGS.push(
{id:'r-jobad', ctx:'trabajo', title:'Reading a job ad', level:'A2', minutes:6,
 before:'Antes de leer: ¿qué tres datos buscas primero en una oferta de trabajo? Comprueba si los encuentras rápido.',
 paras:[
 'CUSTOMER SERVICE ASSISTANT (BILINGUAL). Full-time, hybrid.',
 'We are a growing online store that sells health and beauty products in Latin America and the United States. We are looking for a friendly, organized person to join our customer service team.',
 'Responsibilities: answer customer questions by phone, email and chat in English and Spanish; process returns and refunds; record each case in our system; and work with the logistics team to solve delivery problems.',
 'Requirements: intermediate English (B1 or higher); at least six months of experience in customer service or sales; and good computer skills. Experience with health products is a plus, but it is not required.',
 'We offer: a permanent contract, training during the first month, two days of remote work per week, and health insurance. To apply, send your resume and a short cover letter before March 15. Only selected candidates will be contacted.'],
 gloss:[['hybrid','híbrido (oficina y casa)'],['Responsibilities','funciones'],['returns and refunds','devoluciones y reembolsos'],['record','registrar'],['logistics team','equipo de logística'],['Requirements','requisitos'],['is a plus','suma puntos'],['permanent contract','contrato indefinido'],['training','capacitación'],['selected candidates','candidatos seleccionados']],
 q:[['tf','The job is part-time.',null,1],
    ['tf','Candidates must have experience with health products.',null,1],
    ['tf','The company has an office in Mexico.',null,2],
    ['mc','What English level do they ask for?',['A2','B1 or higher','C2'],1],
    ['mc','How many days of remote work do they offer?',['One','Two','Five'],1]]},

{id:'r-tellme', ctx:'trabajo', title:'How to answer «Tell me about yourself»', level:'A2–B1', minutes:6,
 before:'¿Cómo responderías hoy a «Tell me about yourself»? Piénsalo 30 segundos y luego compara con el consejo del texto.',
 paras:[
 'It is usually the first question in a job interview, and many candidates find it difficult. The interviewer does not want your life story. They want a short summary that shows why you are a good fit for the job.',
 'A simple structure is present, past and future. Start with the present: who you are and what you do now. Then talk about the past: your studies, your experience and one achievement. Finish with the future: why you want this job and what you can offer.',
 'For example: «I\'m a final-year university student. Last year I worked part-time in a call center, where I helped about forty customers a day. Now I want a job where I can use my English and keep learning.»',
 'Keep your answer between sixty and ninety seconds. Practise it out loud, but do not memorize every word, or it will sound like a recording. Finally, prepare one or two examples that show your skills, because the interviewer will probably ask more questions about them.'],
 gloss:[['candidates','candidatos'],['life story','historia de vida'],['summary','resumen'],['a good fit','la persona adecuada'],['achievement','logro'],['offer','ofrecer'],['out loud','en voz alta'],['memorize','memorizar'],['recording','grabación'],['probably','probablemente']],
 q:[['tf','The interviewer wants to hear your whole life story.',null,1],
    ['tf','The text suggests a present-past-future structure.',null,0],
    ['tf','Most interviews last thirty minutes.',null,2],
    ['mc','How long should your answer be?',['10–20 seconds','60–90 seconds','About five minutes'],1],
    ['mc','Why shouldn\'t you memorize every word?',['It will sound like a recording','It takes too much time','Interviewers prefer short answers'],0]]},

{id:'r-email', ctx:'trabajo', title:'A professional email', level:'A2', minutes:5,
 before:'Fíjate en la estructura: asunto, saludo, para qué escribe, por qué es buena candidata, cierre. Te servirá de modelo.',
 paras:[
 'Subject: Application for the Customer Service Assistant position',
 'Dear Ms. Johnson,',
 'I am writing to apply for the Customer Service Assistant position that I saw on your website. I am a final-year university student, and I have one year of experience in customer service at a call center.',
 'In my current job, I answer around forty calls a day and solve problems with orders and payments. I speak Spanish and English, and I am comfortable using computers and new software.',
 'I have attached my resume. I would welcome the opportunity to discuss how I can contribute to your team. I am available for an interview any weekday after 2 p.m.',
 'Thank you for your time and consideration. Best regards, Valentina Ruiz'],
 gloss:[['Subject','asunto'],['to apply for','para postularme a'],['final-year','de último año'],['current job','trabajo actual'],['around','alrededor de'],['comfortable','a gusto; con soltura'],['attached','adjunté'],['would welcome the opportunity','agradecería la oportunidad'],['contribute','aportar'],['consideration','consideración']],
 q:[['tf','Valentina saw the job on the company website.',null,0],
    ['tf','She has no work experience.',null,1],
    ['tf','Ms. Johnson is the manager of the customer service team.',null,2],
    ['mc','How many calls does she answer a day?',['About fourteen','About forty','About four hundred'],1],
    ['mc','When is she available for an interview?',['Weekday mornings','Any weekday after 2 p.m.','Only on weekends'],1]]},

{id:'r-room', ctx:'diario', title:'Renting a room in a new city', level:'A2', minutes:6,
 before:'Si te mudaras a otra ciudad por trabajo, ¿qué preguntarías antes de alquilar una habitación?',
 paras:[
 'When Diego got a job in another city, he needed to find a place to live quickly. He did not have much money, so he decided to rent a room in a shared apartment.',
 'He looked at several ads online. Some rooms were cheap but very far from his office. Others were close but too expensive. Finally, he found a room twenty minutes from work by bus, in a quiet neighborhood with a supermarket nearby.',
 'Before signing the contract, Diego asked some important questions: How much is the deposit? Are the bills included in the rent? Can I have guests? How long is the contract? He also met his future roommates to see if they got along.',
 'Now Diego shares the apartment with two roommates, a nurse and a graphic designer. They split the bills and take turns cleaning the kitchen. His advice: «Never pay a deposit before you see the room in person.»'],
 gloss:[['rent','alquilar; arriendo'],['shared apartment','apartamento compartido'],['ads','anuncios'],['nearby','cerca'],['deposit','depósito'],['bills','cuentas; servicios'],['guests','visitas'],['got along','se llevaban bien'],['split the bills','dividen las cuentas'],['take turns','se turnan']],
 q:[['tf','Diego rented a whole apartment.',null,1],
    ['tf','The room is twenty minutes from his office by bus.',null,0],
    ['tf','Diego\'s roommates are older than him.',null,2],
    ['mc','What did Diego do before signing the contract?',['He asked questions and met his roommates','He paid the deposit online','He bought furniture'],0],
    ['mc','What is Diego\'s advice?',['Always live alone','Never pay a deposit before you see the room','Choose the cheapest room'],1]]},

{id:'r-remote', ctx:'trabajo', title:'Remote work: pros and cons', level:'B1', minutes:7,
 before:'¿Preferirías trabajar desde casa o en una oficina? Busca en el texto un argumento a favor y uno en contra.',
 paras:[
 'Since 2020, millions of people have worked from home at least part of the week. For many workers, remote work means no commuting, more flexible hours and more time with family. Companies can also hire talented people who live in other cities or even in other countries.',
 'However, remote work also has disadvantages. Some people feel isolated, and it can be harder to separate work from personal life. New employees, in particular, may learn more slowly, because they cannot watch and ask experienced colleagues as easily.',
 'For this reason, many companies now use a hybrid model: employees work some days at the office and some days at home. Research on productivity shows mixed results, and the answer seems to depend on the type of job and on how the team communicates.',
 'For language learners, remote and international jobs are a big opportunity, but they require clear written English. Emails, chats and video calls are the main tools, so being able to write short, polite and precise messages is often as important as speaking.'],
 gloss:[['commuting','desplazarse al trabajo'],['flexible hours','horario flexible'],['talented','talentosas'],['disadvantages','desventajas'],['isolated','aislados'],['in particular','en especial'],['hybrid model','modelo híbrido'],['productivity','productividad'],['mixed results','resultados mixtos'],['precise','precisos']],
 q:[['tf','Remote work can help companies hire people from other cities.',null,0],
    ['tf','Research shows that remote workers are always more productive.',null,1],
    ['tf','Most companies in Latin America use a hybrid model.',null,2],
    ['mc','Why may new employees learn more slowly at home?',['They have less work','They cannot watch and ask experienced colleagues as easily','They don\'t have computers'],1],
    ['mc','What is very important in international remote jobs, according to the text?',['Clear written English','A British accent','Long emails'],0]]}
);

/* ---------- Habla ---------- */
const QQ_CTX = { 10: 'farma', 11: 'trabajo', 12: 'farma' };
QUICK_QUESTIONS.forEach((q, i) => { if (!q[3]) q[3] = QQ_CTX[i] || 'diario'; });
QUICK_QUESTIONS.push(
['Tell me about yourself.','I\'m a final-year student. I\'ve worked part-time in customer service, and now I\'m looking for a job where I can use my English and keep learning.','Presente → pasado → futuro · I\'m looking for…','trabajo'],
['What are your strengths?','I\'m organized and responsible. For example, at my last job I was in charge of the weekly schedule, and I never missed a deadline.','One of my strengths is… · For example…','trabajo'],
['What is your greatest weakness?','Sometimes I spend too much time on details. Now I set a time limit for each task, and it helps me a lot.','Sometimes I… · Now I… · It helps me…','trabajo'],
['Why do you want this job?','Because it matches my skills, and I want to grow in an international company where I can use English every day.','It matches my… · I want to grow…','trabajo'],
['Tell me about a time you solved a problem.','Once, a customer received the wrong product. I apologized, checked the order and sent the right one the same day. The customer was very happy.','Once,… · I decided to… · In the end…','trabajo'],
['Where do you see yourself in five years?','In five years, I see myself with more responsibility, maybe leading a small team, and speaking English fluently.','In five years, I see myself… · maybe…','trabajo'],
['Why should we hire you?','Because I learn fast, I communicate well, and I really want to grow with your company.','Because I… · I can offer…','trabajo'],
['How do you handle stress at work?','I make a list of priorities and I focus on one task at a time. I also take short breaks.','When I feel stressed, I… · I focus on…','trabajo'],
['Do you prefer working alone or in a team?','I enjoy both, but I prefer working in a team because I learn a lot from other people.','I enjoy both, but… · because…','trabajo'],
['What kind of food do you like?','I love home-made food, especially soups, but I also like trying food from other countries.','I love… · especially… · I also like…','diario'],
['Describe your best friend.','My best friend is funny and very honest. We met at school, and we still talk almost every day.','He/She is… · We met… · We still…','diario']
);

const CUE_CTX = { 'c-medicine': 'farma', 'c-practical': 'farma', 'c-teacher': 'diario', 'c-future': 'trabajo', 'c-place': 'diario', 'c-patient': 'farma', 'c-sick': 'diario', 'c-hometown': 'diario' };
CUE_CARDS.forEach(c => { c.ctx = c.ctx || CUE_CTX[c.id] || 'diario'; });
CUE_CARDS.push(
{id:'c-job', ctx:'trabajo', title:'A job you would like to have', points:['What the job is','What skills it needs','Why it interests you','What you need to do to get it']},
{id:'c-problem', ctx:'trabajo', title:'A time you solved a problem', points:['What the problem was','What you did','Who helped you','What you learned']},
{id:'c-skill', ctx:'trabajo', title:'Your best skill', points:['What it is','How you learned it','How you use it','Why it is useful at work']},
{id:'c-trip', ctx:'diario', title:'A trip you remember', points:['Where you went','Who you went with','What you did','Why you remember it']},
{id:'c-person', ctx:'diario', title:'A person you admire', points:['Who the person is','What they do','Why you admire them','What you learned from them']}
);

const RP_CTX = { 'rp-counter': 'farma', 'rp-customer': 'farma', 'rp-exchange': 'diario', 'rp-interview': 'trabajo', 'rp-exam': 'diario', 'rp-explain': 'farma' };
ROLEPLAYS.forEach(r => { r.ctx = r.ctx || RP_CTX[r.id] || 'diario'; });
ROLEPLAYS.push(
{id:'rp-jobint', ctx:'trabajo', title:'Entrevista de trabajo (general)', ai:'a friendly but professional HR interviewer for an entry-level bilingual customer service job at an international company. Ask typical interview questions one at a time: tell me about yourself, experience, strengths, a weakness, a problem you solved, why this job, availability. After about 8 questions, close the interview politely', user:'a candidate applying for the job', goal:'Practica las preguntas clásicas de entrevista. Responde con ejemplos concretos (situación → qué hiciste → resultado).', opener:'Hi, thanks for coming in today. Let\'s start with an easy one: can you tell me a little about yourself?'},
{id:'rp-smalltalk', ctx:'trabajo', title:'Charla con un colega nuevo', ai:'a friendly coworker who meets the learner on their first day at a new job and makes small talk (weekend, hometown, hobbies, lunch plans)', user:'a new employee on their first day', goal:'Small talk: la conversación ligera que construye relaciones en el trabajo. Haz preguntas tú también.', opener:'Hey! You must be new here. I\'m Jordan. How\'s your first day going?'},
{id:'rp-service', ctx:'trabajo', title:'Atención al cliente: tú atiendes', ai:'a customer calling an online store because a package arrived three days late and one item is missing. Be polite but a little frustrated', user:'a customer service agent', goal:'Discúlpate, pide datos (nombre, número de pedido), propón una solución y cierra con cortesía.', opener:'Hi, I\'m calling because my order arrived three days late, and one of the items is missing.'},
{id:'rp-videocall', ctx:'trabajo', title:'Reunión por videollamada', ai:'a team leader running a short weekly video meeting. Ask the learner for an update on their tasks, a problem they have, and when they can deliver', user:'a team member giving a project update', goal:'Da un reporte breve: qué terminaste, qué falta, qué problema hay y cuándo entregas.', opener:'Hi! Can you hear me okay? Great. Let\'s start with you: can you give us a quick update on your tasks this week?'},
{id:'rp-cafe', ctx:'diario', title:'En una cafetería o restaurante', ai:'a friendly server at a café in an English-speaking city. At some point, bring a small problem (for example, an item is not available)', user:'a customer ordering food and drinks', goal:'Pide, pregunta por ingredientes, resuelve un pequeño problema y paga.', opener:'Hi there! Welcome. Are you ready to order, or do you need a minute?'},
{id:'rp-directions', ctx:'diario', title:'Pedir indicaciones en la calle', ai:'a helpful local person on the street in a big English-speaking city', user:'a visitor who is lost and needs directions to the train station and then to a pharmacy', goal:'Pide indicaciones, repite para confirmar lo que entendiste y da las gracias.', opener:'You look a little lost. Can I help you?'}
);

const WRITING_CTX = { 'w-email': 'diario', 'w-routine': 'diario', 'w-practical': 'farma', 'w-patient': 'farma', 'w-intro': 'diario', 'w-opinion': 'farma', 'w-summary': 'farma', 'w-motivation': 'trabajo' };
WRITING_PROMPTS.forEach(w => { w.ctx = w.ctx || WRITING_CTX[w.id] || 'diario'; });
WRITING_PROMPTS.push(
{id:'w-cvsummary', ctx:'trabajo', level:'A2', title:'Resumen profesional para tu hoja de vida', task:'Write a short professional summary for the top of your resume: who you are, your main studies or experience, two skills, and the kind of job you want.', words:'40–60', chunks:['Final-year … student with…','Experience in…','Strong … skills','Looking for a position in…']},
{id:'w-thanks', ctx:'trabajo', level:'A2', title:'Correo de agradecimiento tras una entrevista', task:'Write a short email to thank the interviewer after a job interview. Mention one thing you talked about and say that you are still very interested.', words:'60–90', chunks:['Dear …,','Thank you for taking the time to…','I enjoyed learning about…','I am still very interested in…','Best regards,']},
{id:'w-inquiry', ctx:'trabajo', level:'A2', title:'Pedir información sobre una vacante', task:'Write an email to a company to ask for more information about a job: the schedule, the salary range and the start date.', words:'60–90', chunks:['I am writing to ask about…','Could you tell me…?','I would also like to know…','Thank you in advance.']},
{id:'w-message', ctx:'trabajo', level:'A2', title:'Mensaje a un colega', task:'Write a message to a coworker: you can\'t go to tomorrow\'s meeting. Apologize, explain why, and suggest another time.', words:'40–60', chunks:['Hi …,','I\'m afraid I can\'t…','Would … work for you?','Sorry for the inconvenience!']},
{id:'w-cover', ctx:'trabajo', level:'B1', title:'Carta de presentación', task:'Write a cover letter for a job you would really like. Say which position you are applying for, why you are a good candidate (with one concrete example) and when you are available.', words:'120–150', chunks:['Dear Hiring Manager,','I am writing to apply for…','In my previous job / my studies, I…','I would welcome the opportunity to…','I am available…']},
{id:'w-profile', ctx:'trabajo', level:'B1', title:'Perfil profesional («About»)', task:'Write the «About» section of your professional profile: who you are, what you are good at, one achievement, and what opportunities you are looking for.', words:'80–120', chunks:['I am a … who…','I am especially good at…','Recently, I…','I am open to opportunities in…']}
);

/* ---------- Gramática: dos unidades para comunicarse en el trabajo ---------- */
GRAMMAR.splice(GRAMMAR.findIndex(u => u.id === 'g-modals') + 1, 0,
{id:'g-questions', title:'Preguntas: orden y preguntas indirectas', level:'A2',
 idea:'En inglés las preguntas cambian el orden: auxiliar + sujeto + verbo (Where do you work?). Pero en las preguntas indirectas, más educadas y muy usadas en el trabajo («Could you tell me…?»), el orden vuelve a ser el normal: sujeto + verbo.',
 form:[['Wh- + auxiliar + sujeto + verbo','Where do you work?'],['Con be: Wh- + be + sujeto','Where is the office?'],['Indirecta: Could you tell me + wh- + sujeto + verbo','Could you tell me where the office is?'],['Sí/no indirecta: … if + sujeto + verbo','Do you know if the job is full-time?']],
 errors:[['Where you work?','Where do you work?','Falta el auxiliar do.'],
         ['Could you tell me where is the office?','Could you tell me where the office is?','En la pregunta indirecta, el verbo va después del sujeto.'],
         ['Do you know what time does the meeting start?','Do you know what time the meeting starts?','En la indirecta desaparece does y el verbo lleva -s.'],
         ['What means «deadline»?','What does «deadline» mean?','Las preguntas directas con verbos normales necesitan do/does.']],
 examples:[['What does the job involve?','¿En qué consiste el trabajo?'],['Could you tell me what the salary is?','¿Podría decirme cuál es el salario?'],['Do you know if they are hiring?','¿Sabes si están contratando?']],
 ex:[['mc','___ do you live?',['Where','Where you','What where'],0,'Wh- + do + sujeto + verbo.'],
     ['fill','How long ___ you worked there?',['have'],'Present perfect: have + sujeto + participio.'],
     ['fix','Where you work now?',['Where do you work now?'],'Falta el auxiliar do.'],
     ['mc','Could you tell me where ___?',['is the station','the station is','does the station'],1,'Indirecta: sujeto + verbo.'],
     ['fix','Can you tell me what time does the interview start?',['Can you tell me what time the interview starts?'],'Indirecta: sin does, y el verbo con -s.'],
     ['mc','Do you know ___ the job is full-time?',['if','that','what'],0,'Pregunta indirecta de sí o no → if.'],
     ['order',['me','could','tell','is','what','you','the salary'],'Could you tell me what the salary is?','¿Podría decirme cuál es el salario?'],
     ['fill','What ___ «deadline» mean?',['does'],'Pregunta directa con verbo normal → does.']]},
{id:'g-polite', title:'Pedir con cortesía: could, would, I\'d like', level:'A2',
 idea:'En inglés el tono importa tanto como la gramática. «Give me the report» es correcto pero suena brusco. En el trabajo y en la calle se usan fórmulas suaves: Could you…?, Would you mind + -ing?, I\'d like…, Would it be possible to…?',
 form:[['Could you + verbo…?','Could you send me the file?'],['Would you mind + verbo-ing…?','Would you mind closing the door?'],['I\'d like + sustantivo / to + verbo','I\'d like to ask a question.'],['Would it be possible to + verbo…?','Would it be possible to change the date?'],['Ofrecer: Would you like…? / Shall I…?','Would you like some coffee? Shall I help you?']],
 errors:[['I want the bill.','Could I have the bill, please?','«I want» suena exigente al pedir.'],
         ['Would you mind to send it?','Would you mind sending it?','Would you mind + -ing.'],
         ['Can you to help me?','Can you help me?','Después de can/could no va «to».'],
         ['Do you want a coffee? (a un cliente)','Would you like a coffee?','Would you like es la forma cortés de ofrecer.']],
 examples:[['Could you repeat that, please?','¿Podría repetir eso, por favor?'],['Would you mind waiting a moment?','¿Le importaría esperar un momento?'],['Would it be possible to start on Monday?','¿Sería posible empezar el lunes?']],
 ex:[['mc','Which sentence is the most polite?',['Send me the report.','I want the report.','Could you send me the report, please?'],2,'Could you…? suaviza la petición.'],
     ['fix','Would you mind to close the window?',['Would you mind closing the window?'],'Would you mind + -ing.'],
     ['fill','Would you ___ some water? (ofrecer)',['like'],'Para ofrecer: Would you like…?'],
     ['mc','___ it be possible to change the interview time?',['Would','Do','Is'],0,'Would it be possible to…?'],
     ['fix','Can you to help me with this form?',['Can you help me with this form?'],'can + verbo base.'],
     ['mc','In a restaurant, the most natural is:',['I want the check.','Could we have the check, please?','Give us the check.'],1,'Fórmula educada.'],
     ['order',['to','I\'d','a question','ask','like'],'I\'d like to ask a question.','Me gustaría hacer una pregunta.'],
     ['fill','Would you mind ___ (wait) a moment?',['waiting'],'Would you mind + -ing.']]}
);

/* ---------- Pronunciación ---------- */
STRESS_WORDS.push(['interview','in·ter·view',0],['experience','ex·pe·ri·ence',1],['opportunity','op·por·tu·ni·ty',2],['available','a·vail·a·ble',1],['responsible','re·spon·si·ble',1],['colleague','col·league',0],['company','com·pa·ny',0],['develop','de·vel·op',1],['communication','com·mu·ni·ca·tion',3],['management','man·age·ment',0],['customer','cus·tom·er',0],['position','po·si·tion',1]);
READ_ALOUD.push(
['I\'m a fast learner and I work well in a team.','/ɪ/ en in, /iː/ en team'],
['Could you tell me more about the position?','/ʊ/ en could, acento po·SI·tion'],
['I\'m available to start next Monday.','acento a·VAIL·a·ble, s- inicial en start'],
['Thank you for the opportunity.','/θ/ en thank, acento op·por·TU·ni·ty'],
['I have three years of experience in customer service.','/θ/ en three, /v/ en service, acento ex·PE·ri·ence']
);
