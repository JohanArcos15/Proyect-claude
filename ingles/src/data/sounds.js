/* Pronunciación para hispanohablantes.
   Prioridad = carga funcional aproximada (cuántas palabras distingue el contraste) + frecuencia del error
   (Munro & Derwing 2006; Brown 1991). Es una guía, no una clasificación exacta. */
const HVPT_SETS = [
{id:'ii', a:'/iː/', b:'/ɪ/', name:'sheep · ship', prio:'Alta',
 why:'El español tiene una sola «i». El inglés tiene dos: /iː/ larga y tensa, /ɪ/ corta y relajada. Si las mezclas, «feel» suena «fill» y «leave» suena «live».',
 how:'/iː/: estira los labios como sonriendo y alarga. /ɪ/: más corta, la boca un poco más abierta y relajada, a medio camino hacia una «e».',
 pairs:[['sheep','ship'],['leave','live'],['feel','fill'],['heat','hit'],['seat','sit'],['peel','pill'],['cheap','chip'],['reach','rich'],['sleep','slip'],['eat','it'],['deep','dip'],['meal','mill']]},
{id:'ae', a:'/æ/', b:'/ʌ/', name:'cap · cup', prio:'Alta',
 why:'Ninguna de las dos existe en español: tendemos a decir «a» para ambas. «Drag» y «drug» terminan sonando igual.',
 how:'/æ/: abre mucho la boca, mandíbula abajo, entre «a» y «e». /ʌ/: una «a» corta y relajada, boca poco abierta, como un «ah» rápido.',
 pairs:[['cap','cup'],['cat','cut'],['bag','bug'],['ran','run'],['hat','hut'],['match','much'],['fan','fun'],['lack','luck'],['drag','drug'],['bat','but'],['ankle','uncle']]},
{id:'ea', a:'/e/', b:'/æ/', name:'bed · bad', prio:'Alta',
 why:'Tu «e» española cubre /e/, pero /æ/ no existe: «bad» y «bed», o «men» y «man», se confunden fácilmente.',
 how:'/e/: como la «e» española. /æ/: igual, pero bajando más la mandíbula, casi hacia la «a».',
 pairs:[['bed','bad'],['pen','pan'],['men','man'],['said','sad'],['set','sat'],['head','had'],['send','sand'],['bet','bat'],['dead','dad'],['lend','land'],['pet','pat']]},
{id:'uo', a:'/ʌ/', b:'/ɑː/', name:'cup · cop', prio:'Media',
 why:'Ambas se parecen a nuestra «a», pero el inglés las distingue: «shut» (cerrar) y «shot» (inyección, disparo).',
 how:'/ʌ/: corta y central, boca poco abierta. /ɑː/: boca muy abierta y sonido más largo, desde atrás (en Reino Unido se oye más redondeada).',
 pairs:[['cup','cop'],['luck','lock'],['duck','dock'],['hut','hot'],['nut','not'],['shut','shot'],['gut','got'],['rub','rob']]},
{id:'uu', a:'/uː/', b:'/ʊ/', name:'pool · pull', prio:'Media',
 why:'Igual que con la «i»: el español tiene una sola «u» y el inglés tiene dos.',
 how:'/uː/: labios redondeados y adelantados, larga. /ʊ/: corta y relajada, labios menos redondeados.',
 pairs:[['pool','pull'],['fool','full'],['Luke','look'],['suit','soot'],['wooed','wood'],['stewed','stood'],['who\'d','hood'],['cooed','could']]},
{id:'bv', a:'/b/', b:'/v/', name:'berry · very', prio:'Media',
 why:'En español «b» y «v» suenan igual. En inglés /v/ se hace con los dientes de arriba sobre el labio inferior.',
 how:'/b/: los dos labios se juntan. /v/: dientes superiores sobre el labio inferior, y que vibre (es una /f/ con voz).',
 pairs:[['berry','very'],['ban','van'],['best','vest'],['boat','vote'],['bet','vet'],['base','vase'],['bent','vent'],['curb','curve']]},
{id:'sz', a:'/s/', b:'/z/', name:'price · prize', prio:'Media',
 why:'En español la /z/ solo aparece por contagio de otra consonante. En inglés distingue palabras y además marca plurales y verbos: «advice» (consejo) frente a «advise» (aconsejar).',
 how:'/z/: la misma posición que /s/, pero con zumbido. Pon la mano en la garganta: debe vibrar.',
 pairs:[['price','prize'],['sip','zip'],['bus','buzz'],['rice','rise'],['peace','peas'],['place','plays'],['loose','lose'],['advice','advise'],['sink','zinc'],['face','phase']]},
{id:'st', a:'/s/', b:'/θ/', name:'sink · think', prio:'Media',
 why:'En Latinoamérica no usamos /θ/: «think» se vuelve «sink» y «thick» se vuelve «sick».',
 how:'/θ/: la punta de la lengua entre los dientes, soplando aire sin vibración.',
 pairs:[['sink','think'],['sick','thick'],['sing','thing'],['mouse','mouth'],['pass','path'],['sank','thank'],['sum','thumb'],['face','faith'],['tense','tenth']]},
{id:'dd', a:'/d/', b:'/ð/', name:'day · they', prio:'Baja',
 why:'Nuestra «d» suave entre vocales («cada») se parece a /ð/, pero al inicio de palabra decimos /d/: «they» suena «day».',
 how:'/ð/: como /θ/ (lengua entre los dientes) pero con vibración.',
 pairs:[['day','they'],['dare','there'],['den','then'],['doze','those'],['ladder','lather'],['breed','breathe'],['dough','though'],['udder','other']]},
{id:'sh', a:'/ʃ/', b:'/tʃ/', name:'share · chair', prio:'Media',
 why:'En muchas regiones /ʃ/ no existe o se confunde con la «ch»: «wash» y «watch» terminan sonando igual.',
 how:'/ʃ/: sonido continuo, como pedir silencio («shhh»). /tʃ/: explosivo y corto, como la «ch» de «chico».',
 pairs:[['share','chair'],['ship','chip'],['shoes','choose'],['wash','watch'],['cash','catch'],['sheep','cheap'],['shop','chop'],['wish','witch'],['mash','match']]},
{id:'jy', a:'/dʒ/', b:'/j/', name:'jet · yet', prio:'Media',
 why:'Nuestra «y» varía mucho según la región; en inglés «jet» y «yet», o «Jess» y «yes», son palabras distintas.',
 how:'/dʒ/: como una «ch» con voz (la «j» de «jam»). /j/: una «i» rápida deslizándose, sin fricción.',
 pairs:[['jet','yet'],['jaw','yaw'],['joke','yolk'],['jam','yam'],['Jess','yes'],['jello','yellow'],['major','mayor'],['juice','use']]},
{id:'hh', a:'/h/', b:'(sin h)', name:'hill · ill', prio:'Media',
 why:'La «h» inglesa se pronuncia (suave, solo aire), mientras que nuestra «h» es muda. Si la omites, «hill» (colina) suena como «ill» (enfermo); si la haces fuerte como nuestra «j», suena áspera.',
 how:'/h/: suelta aire como cuando empañas un vidrio, sin raspar la garganta.',
 pairs:[['hill','ill'],['heat','eat'],['hair','air'],['hold','old'],['hate','eight'],['heart','art'],['high','I'],['hand','and'],['his','is']]},
{id:'nn', a:'/n/', b:'/ŋ/', name:'thin · thing', prio:'Media',
 why:'Al final de palabra el español no distingue /n/ de /ŋ/: «sin» y «sing» se confunden, y también las terminaciones -ing.',
 how:'/ŋ/: la parte de atrás de la lengua sube al paladar blando, como en «tengo», sin pronunciar la «g».',
 pairs:[['thin','thing'],['sin','sing'],['ban','bang'],['ran','rang'],['win','wing'],['kin','king'],['sun','sung'],['ton','tongue']]}
];

/* Acento de palabra: [palabra, sílabas separadas por ·, índice de la sílaba tónica] */
const STRESS_WORDS = [
['pharmacy','phar·ma·cy',0],['pharmacology','phar·ma·col·o·gy',2],['pharmaceutical','phar·ma·ceu·ti·cal',2],
['medicine','med·i·cine',0],['chemistry','chem·is·try',0],['analysis','a·nal·y·sis',1],['analyze','an·a·lyze',0],
['molecule','mol·e·cule',0],['molecular','mo·lec·u·lar',1],['metabolism','me·tab·o·lism',1],['absorption','ab·sorp·tion',1],
['prescription','pre·scrip·tion',1],['antibiotic','an·ti·bi·ot·ic',3],['hypothesis','hy·poth·e·sis',1],['diagnosis','di·ag·no·sis',2],
['therapeutic','ther·a·peu·tic',2],['concentration','con·cen·tra·tion',2],['development','de·vel·op·ment',1],['vegetable','veg·e·ta·ble',0],
['comfortable','com·for·ta·ble',0],['hotel','ho·tel',1],['enzyme','en·zyme',0],['receptor','re·cep·tor',1],['inhibitor','in·hib·i·tor',1],
['photograph','pho·to·graph',0],['photography','pho·tog·ra·phy',1],['biology','bi·ol·o·gy',1],['technology','tech·nol·o·gy',1],
['clinical','clin·i·cal',0],['experiment','ex·per·i·ment',1],['laboratory','lab·o·ra·to·ry',0],['allergy','al·ler·gy',0],
['vaccine','vac·cine',1],['pipette','pi·pette',1],['agonist','ag·o·nist',0],['antagonist','an·tag·o·nist',1],['efficacy','ef·fi·ca·cy',0],
['adherence','ad·her·ence',1],['toxicity','tox·ic·i·ty',1],['dosage','dos·age',0]
];
const STRESS_RULES = [
'-ology: acento en la tercera sílaba contando desde el final (bi·OL·o·gy, phar·ma·COL·o·gy, tech·NOL·o·gy).',
'-ic, -ical, -ity, -tion: acento en la sílaba justo antes de la terminación (an·ti·bi·OT·ic, CLIN·i·cal, tox·IC·i·ty, pre·SCRIP·tion).',
'Muchos cognados cambian de acento respecto al español: MED·i·cine, AN·a·lyze, MOL·e·cule, AL·ler·gy.',
'Los sustantivos de dos sílabas suelen acentuarse en la primera (DOS·age, EN·zyme); muchos verbos, en la segunda (to in·CREASE).'
];

/* Terminaciones -ed y -s */
const ED_WORDS = [
['worked','t'],['stopped','t'],['washed','t'],['mixed','t'],['helped','t'],['looked','t'],['watched','t'],['missed','t'],['coughed','t'],
['played','d'],['cleaned','d'],['absorbed','d'],['called','d'],['studied','d'],['measured','d'],['prescribed','d'],['dissolved','d'],['stirred','d'],
['wanted','id'],['needed','id'],['tested','id'],['diluted','id'],['added','id'],['started','id'],['treated','id'],['recorded','id'],['decided','id']
];
const S_WORDS = [
['stops','s'],['works','s'],['takes','s'],['tests','s'],['helps','s'],['drinks','s'],['weeks','s'],
['plays','z'],['cells','z'],['drugs','z'],['needs','z'],['lungs','z'],['kidneys','z'],['dissolves','z'],['pills','z'],
['doses','iz'],['boxes','iz'],['washes','iz'],['mixes','iz'],['causes','iz'],['pages','iz'],['sizes','iz'],['nurses','iz']
];
const ED_RULE = 'Después de /t/ o /d/ → /ɪd/ (wanted, needed). Después de un sonido sordo (/p k f s ʃ tʃ/) → /t/ (worked, washed). En los demás casos → /d/ (played, cleaned). La e casi nunca se pronuncia: «worked» tiene UNA sílaba.';
const S_RULE = 'Después de /s z ʃ tʃ dʒ/ → /ɪz/ (doses, washes). Después de un sonido sordo (/p t k f θ/) → /s/ (stops, tests). En los demás casos → /z/ (drugs, cells, plays).';

/* Grupos con s- inicial: el error típico es añadir una «e» delante. */
const S_CLUSTERS = ['speak','study','student','school','Spanish','stomach','stress','sterile','strong','spray','scale','skin','smoke','sleep','sneeze','spoon','stable','statistics'];

/* Frases para leer en voz alta (dictado → comparación). Cada una mezcla sonidos difíciles. */
const READ_ALOUD = [
['Please take this pill with a full glass of water.','/ɪ/ en pill, full /ʊ/'],
['Can I sit in this seat?','/ɪ/ frente a /iː/'],
['We heat the solution and stir it slowly.','heat /iː/, stir'],
['This drug can make you feel very sleepy.','drug /ʌ/, very /v/, feel /iː/'],
['I think the vaccine was very effective.','/θ/, /v/'],
['She washed the beakers and checked the results.','-ed: /t/ en washed y checked'],
['The liver and the kidneys clear most drugs.','/v/, -s como /z/'],
['Don\'t drink alcohol while you take these tablets.','th de these, -s'],
['My favorite subject is biochemistry.','/v/, ch = /k/'],
['The half-life of this drug is about two hours.','/h/, la l muda de half'],
['We measured the pH of the buffer solution.','-ed /d/, /ʌ/ en buffer'],
['Hold the bottle with both hands.','/h/, /θ/ en both'],
['Yesterday I studied pharmacology for three hours.','/θ/ en three, acento de pharmaCOLogy'],
['Students often study in the library.','s- inicial sin «e»'],
['The patient has a cough and a sore throat.','patient /ʃ/, cough, /θ/ en throat']
];
