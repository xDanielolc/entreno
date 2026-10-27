// Rutinas prehechas: se añaden a tus rutinas con un toque, y sus ejercicios
// a tus ejercicios (si ya tienes uno con el mismo nombre, se usa el tuyo).
//
// Las de Heavy Duty resumen, con palabras propias, las rutinas que propone
// Mike Mentzer en «Heavy Duty»: solo la lista de ejercicios y el reparto por
// días, que es lo que hace falta para seguirlas.

import { generarEscalera } from './calculos.js';
import { CATALOGO, normalizar } from './catalogo.js';
import { DIAS_CICLO_POR_DEFECTO, serieNuevaPlantilla } from './esquema.js';
import { ejercicioDesdeCatalogo } from './vistas/selector-ejercicios.js';
import { nuevoId } from './ui.js';
import { analizarRutina, crearRutinaDesdeTexto } from './rutina-texto.js';

// Formas de serie que usan las plantillas.
const bilbo = { tipo: 'bilbo' };
const dropSet = (min, max) => ({ tipo: 'intensidad', tecnicas: ['drop-set'], objetivo: [min, max] });
const isometrico = (min, max) => ({ tipo: 'intensidad', tecnicas: ['isometrico-final'], objetivo: [min, max] });
const excentricas = (min, max) => ({ tipo: 'intensidad', tecnicas: ['excentricas-lentas'], objetivo: [min, max] });
const alFallo = (min = 6, max = 10) => ({ tipo: 'libre', progresion: 'carga', objetivo: [min, max], alFallo: true });
const sinFallo = (min = 15, max = 20) => ({ tipo: 'libre', progresion: 'carga', objetivo: [min, max] });
const libre = { tipo: 'libre' };
const restPause = (min, max) => ({ tipo: 'intensidad', tecnicas: ['rest-pause'], objetivo: [min, max] });
// Ejercicios de un solo lado: cada serie con su lado (`plan.lado`), para que
// la app diga «izquierda» o «derecha» y guarde lo de cada lado aparte.
// `porLado([f, f])` hace las de la izquierda y después las de la derecha
// (estiramientos: 1-2 un lado, 3-4 el otro); `alternos([f, f])` va alternando
// (fuerza: izquierda, derecha, descanso, izquierda, derecha).
const conLado = (forma, lado) => ({ ...forma, lado });
const porLado = (formas) => [...formas.map((f) => conLado(f, 'izquierda')), ...formas.map((f) => conLado(f, 'derecha'))];
const alternos = (formas) => formas.flatMap((f) => [conLado(f, 'izquierda'), conLado(f, 'derecha')]);
const veces = (n, forma) => Array.from({ length: n }, () => forma);
// Varias series iguales con doble progresión en un rango de repeticiones.
const series = (n, min, max) => Array.from({ length: n }, () => ({ tipo: 'libre', progresion: 'carga', objetivo: [min, max] }));

const programa = (cual, inicial = null) => ({ tipo: 'libre', progresion: 'programa', programa: cual, inicial });
// Estiramiento o ejercicio de movilidad medido en segundos (o repeticiones).
const t = (seg) => ({ tipo: 'libre', progresion: 'libre', objetivo: [seg, seg] });
// N series de repeticiones sin peso, solo para apuntar (sin «sube el peso»).
const reps = (n, min, max = min) => Array.from({ length: n }, () => ({ tipo: 'libre', progresion: 'libre', objetivo: [min, max] }));

const e = (nombre, series, extra = {}) => ({ nombre, series, ...extra });

// Una rutina prehecha escrita como texto (el mismo formato que «Pegar una
// rutina escrita»): permite series distintas del mismo ejercicio según el día.
const deTexto = (texto) => ({ texto, dias: analizarRutina(texto).dias.map((d) => ({ nombre: d.nombre,
  ejercicios: d.ejercicios.map((x) => ({ nombre: x.nombre, series: [], opcional: x.opcional, nota: x.nota })) })) });

export const PLANTILLAS = [
  {
    id: 'fuerza-sin-maquinas',
    // Sube este número cada vez que cambie la rutina: las rutinas hechas con
    // una versión anterior ofrecen actualizarse.
    version: 9,
    nombre: 'Fuerza sin máquinas: cuatro días',
    autor: 'Dan (su rutina de 10-2026)',
    resumen: 'Dos días de torso y dos de pierna, solo con barra, mancuernas y tu peso. Cada básico tiene un día pesado '
      + '(una serie máxima de 1-2 y tres series de bajada de 3-5 al 80 % con 2 en recámara) y otro moderado (una serie Bilbo y dos normales).',
    porQue: 'La fuerza máxima se gana sobre todo con cargas altas y varias series (Lopez 2021; Currier 2023), alternando sesiones '
      + 'pesadas y moderadas (Moesgaard 2022) y quedándose a 2 del fallo en lo pesado, que rinde igual y cansa menos (Pareja-Blanco '
      + '2017; Robinson 2024). La serie máxima de 1-2 repeticiones es la que mejor mide el 1RM (Mayhew 2008) y practicarlo también '
      + 'se entrena (Mattocks 2017); añadirle 2-3 series de bajada pudo dar más fuerza (Androulakis-Korakakis 2021). Las series de más '
      + 'de 12 suelen dar un 1RM más bajo, porque la recámara se calcula peor por encima de 12 (Halperin 2022). La serie Bilbo, ligera y '
      + 'rápida como primera serie, no perjudica el 1RM (González-Alcázar 2025). Tríceps estirado (Maeo 2023), gemelo de pie '
      + '(Kinoshita 2023) y una serie descendente al final para ahorrar tiempo (Sødal 2023). Las dominadas se aprenden con negativas '
      + 'y racimos de 1-2 con pausas (Cuevas-Aburto 2021). Isquios con sus dos gestos (rumano y curl femoral sentado) los dos días de '
      + 'pierna: repartir el volumen no cambia el crecimiento (Schoenfeld 2019), y el curl femoral sentado hizo crecer más los isquios '
      + 'que el tumbado (Maeo 2021) y que el nórdico (Maeo 2024). Calentar mejora el rendimiento sobre todo en lo pesado (Fradkin 2010; '
      + 'Abad 2011). Decisiones prácticas sin estudio propio: las 3 series de bajada de 3-5 (2 en el militar), el 90 % de la serie máxima, el 80 % de las de bajada, '
      + 'el esquema de aproximaciones, el reparto de los isquios, las negativas y la doble progresión.',
    comoSeHace: 'Sigue los cuatro días en orden cuando estés recuperado, sin dejar pasar más de 3 o 4 días entre sesiones. '
      + 'Calentamiento, en este orden: general (10 min de cardio suave los días de pierna, que son el cardio de la semana; 5 min '
      + 'de bici o andar los de torso), 3 min de movilidad de pie y las aproximaciones de cada básico justo antes de él: como mucho '
      + '3, seguidas, muy lejos del fallo, sin contar como volumen. Nunca estires un músculo 60 s o más seguidos antes de un básico '
      + 'pesado. Los básicos pesados: serie máxima de 1-2 repeticiones a 1-2 del fallo (la que mide tu 1RM; si te sobran 3 o más, la app te propone subir y hacer otra sola) y '
      + 'series de bajada de 3-5 al 80 % con 2 en recámara; sus kilos salen de tu 1RM estimado de series de 12 o menos, y la recámara '
      + 'lo corrige de una sesión a la siguiente (a mitad del ejercicio el peso no sube). La Bilbo, de 23-25 a 15 repeticiones con 2 en '
      + 'recámara, superando la anterior. El día moderado, el rumano y los accesorios, en doble progresión. Descansos: 2 min en todo lo '
      + 'pesado (antes y después de la máxima, entre series de bajada y en las normales de la Bilbo), las aproximaciones seguidas, '
      + '60-90 s en los accesorios y 45-60 s en los racimos. Con '
      + 'mancuernas, los kilos son por mancuerna y las repeticiones, por brazo. El curl femoral sentado, en su ficha, «de un solo sitio».',
    ...deTexto(`Día 1: Torso, banca pesada · 60-70 min
Cardio: calentamiento 5 min (bici o andar rápido, a ritmo de poder hablar)
Movilidad dinámica de torso: calentamiento 3 min (de pie y sin pausas: círculos de brazos, 10 en cada sentido; palo, barra vacía o toalla por encima de la cabeza de delante a atrás, 10; giros de tronco con el palo en los hombros, 10 por lado. Nunca estires 60 s o más seguidos un músculo antes de un básico pesado: si lo pide, menos de 60 s y después las aproximaciones)
Press de banca: calentamiento 1 × 5 al 30 % + calentamiento 1 × 3 al 60 % + calentamiento 1 × 1 al 80 % + máxima 1-2 según tu 1RM + 3 × 3-5 al 80 % con 2 en recámara (aproximaciones seguidas, solo lo que tardes en cambiar discos; 2 min antes de la máxima; máxima a un 90 %: 1-2 repeticiones que acaben a 1-2 del fallo; si te sobran 3 o más, deja la barra, sube un 5-10 % y haz otra sola, que cuenta como aproximación: vale la última; 2 min; bajada al 80 % con 2 en recámara, 2 min; que bajen las repeticiones por la fatiga es normal)
Remo con barra: Bilbo + 2 × 8-10 con 2 en recámara (la Bilbo hace de aproximación: de 23-25 a 15 repeticiones con 2 en recámara, superando la anterior; normales con 2-3 en recámara, 2 min)
Press militar: Bilbo + 2 × 8-10 con 2 en recámara (igual que el remo)
Dominadas negativas: 3 × 3-5 (bajada de 3-5 s; sube con salto o desde un banco; 2 min)
Curl martillo: 2 × 8-12 con 1 en recámara, serie descendente en la última (alterno, con mancuernas: kilos por mancuerna y repeticiones por brazo; la descendente, hasta 0-1 en recámara; 90 s)
Extensión de tríceps sobre la cabeza: 2 × 8-12 con 1 en recámara, serie descendente en la última (con mancuerna; la descendente, hasta 0-1 en recámara; 90 s)
Elevaciones laterales: 2 × 12-15 con 1 en recámara (60-90 s)
Pájaro a una mano: 2 × 12-15 por brazo con 1 en recámara (con el brazo estirado; 60 s)

Día 2: Pierna, sentadilla pesada · 70-75 min
Cardio: calentamiento 10 min (suave: bici, cinta o andar rápido, a ritmo de poder hablar; es el calentamiento general y el cardio de la semana a la vez)
Movilidad dinámica de pierna: calentamiento 3 min (de pie y sin pausas: balanceos de pierna adelante y atrás, 10 por pierna; laterales, 10 por pierna; sentadilla profunda sin peso con 2 s abajo, 8; bisagra de cadera sin peso, 8. Nunca estires 60 s o más seguidos un músculo antes de un básico pesado)
Sentadilla: calentamiento 1 × 5 al 30 % + calentamiento 1 × 3 al 60 % + calentamiento 1 × 1 al 80 % + máxima 1-2 según tu 1RM + 3 × 3-5 al 80 % con 2 en recámara (aproximaciones seguidas, solo lo que tardes en cambiar discos; 2 min antes de la máxima; máxima a un 90 %: 1-2 repeticiones que acaben a 1-2 del fallo; si te sobran 3 o más, deja la barra, sube un 5-10 % y haz otra sola, que cuenta como aproximación: vale la última; 2 min; bajada al 80 % con 2 en recámara, 2 min; que bajen las repeticiones por la fatiga es normal)
Gemelo de pie con barra: 3 × 10-15 con 1 en recámara (justo después de la sentadilla, con la barra en la espalda; 90 s)
Peso muerto rumano: calentamiento 1 × 5 al 50 % + 3 × 6-8 con 2 en recámara (desde arriba, rodillas algo flexionadas; 2-3 en recámara; 2 min)
Curl femoral sentado: 2 × 8-12 con 1 en recámara (90 s; en su ficha, «de un solo sitio»)
Rueda abdominal: 2 × 8-12 (60-90 s)

Día 3: Torso, remo pesado · 65-75 min
Cardio: calentamiento 5 min (bici o andar rápido, a ritmo de poder hablar)
Movilidad dinámica de torso: calentamiento 3 min (de pie y sin pausas: círculos de brazos, 10 en cada sentido; palo, barra vacía o toalla por encima de la cabeza de delante a atrás, 10; giros de tronco con el palo en los hombros, 10 por lado. Nunca estires 60 s o más seguidos un músculo antes de un básico pesado: si lo pide, menos de 60 s y después las aproximaciones)
Remo con barra: calentamiento 1 × 5 al 30 % + calentamiento 1 × 3 al 60 % + calentamiento 1 × 1 al 80 % + máxima 1-2 según tu 1RM + 3 × 3-5 al 80 % con 2 en recámara (aproximaciones seguidas, solo lo que tardes en cambiar discos; 2 min antes de la máxima; máxima a un 90 %: 1-2 repeticiones que acaben a 1-2 del fallo; si te sobran 3 o más, deja la barra, sube un 5-10 % y haz otra sola, que cuenta como aproximación: vale la última; 2 min; bajada al 80 % con 2 en recámara, 2 min; que bajen las repeticiones por la fatiga es normal)
Press de banca: Bilbo + 2 × 6-8 con 2 en recámara (va antes que el militar para no llegar con el hombro cargado; la Bilbo hace de aproximación: de 23-25 a 15 repeticiones con 2 en recámara, superando la anterior; normales con 2-3 en recámara, 2 min)
Press militar: calentamiento 1 × 1 al 70 % + máxima 1-2 según tu 1RM + 2 × 3-5 al 80 % con 2 en recámara (ya llegas caliente de la banca: una sola aproximación; 2 min antes de la máxima; máxima a un 90 %, 1-2 con 1-2 en recámara, y si sobran, otra sola con más peso; 2 min; bajada con 2 en recámara, 2 min)
Dominadas: 4 × 1-2 (en racimo: 45-60 s entre series, sin llegar al fallo; cuando salgan 3 seguidas, 3 × 3)
Curl martillo: 2 × 8-12 con 1 en recámara, serie descendente en la última (alterno, con mancuernas: kilos por mancuerna y repeticiones por brazo; la descendente, hasta 0-1 en recámara; 90 s)
Fondos en paralelas negativos: 2 × 3-5 (bajada de 3-5 s; subes con los pies en un banco o de un salto; cuando hagas 5 con 5 s de bajada, prueba fondos normales; 2 min)
Pájaro a una mano: 2 × 12-15 por brazo con 1 en recámara (con el brazo estirado desde el 25-10: pide menos peso; 60 s)

Día 4: Pierna, peso muerto pesado · 75 min
Cardio: calentamiento 10 min (como el día 2)
Movilidad dinámica de pierna: calentamiento 3 min (de pie y sin pausas: balanceos de pierna adelante y atrás, 10 por pierna; laterales, 10 por pierna; sentadilla profunda sin peso con 2 s abajo, 8; bisagra de cadera sin peso, 8; sentadilla sumo sin peso con 2 s abajo, 8. Nunca estires 60 s o más seguidos un músculo antes de un básico pesado)
Peso muerto sumo: calentamiento 1 × 5 al 30 % + calentamiento 1 × 3 al 60 % + calentamiento 1 × 1 al 80 % + máxima 1-2 según tu 1RM + 3 × 2-4 al 80 % con 2 en recámara (la primera aproximación, con los discos grandes más ligeros del gimnasio si el 30 % se queda corto, porque se tira desde el suelo; aproximaciones seguidas, solo lo que tardes en cambiar discos; 2 min antes de la máxima; máxima a un 90 %: 1-2 repeticiones que acaben a 1-2 del fallo; si te sobran 3 o más, deja la barra, sube un 5-10 % y haz otra sola, que cuenta como aproximación: vale la última; 2 min; bajada al 80 % con 2 en recámara, 2 min; que bajen las repeticiones por la fatiga es normal)
Sentadilla: calentamiento 1 × 5 al 50 % + 3 × 6-8 con 2 en recámara (al 70-75 %; la aproximación, seguida; 2 min)
Gemelo de pie con barra: 3 × 10-15 con 1 en recámara (justo después de la sentadilla; 90 s)
Curl femoral sentado: 3 × 8-12 con 1 en recámara (90 s)
Elevación de piernas colgado: 2 × 8-12 (piernas estiradas; 60-90 s)`),
  },
  {
    id: 'plpl-bilbo-heavy-duty',
    nombre: 'PLPL Bilbo + Heavy Duty',
    autor: 'Dan (la rutina con la que se hizo esta app)',
    resumen: 'Cuatro días: empuje, pierna, tirón, pierna. En cada ejercicio, una serie Bilbo y una serie de intensidad.',
    porQue: 'Junta dos ideas. El método Bilbo sube la carga un poco cada día dentro de un ciclo y te pide superar el 1RM del día '
      + 'anterior, con series largas (20-30 repeticiones) y rápidas. Un ensayo muestra que una serie así no perjudica el 1RM '
      + '(González-Alcázar 2025); que cargue menos las articulaciones es una opinión, sin estudio. '
      + 'Detrás va una sola serie muy intensa al estilo Heavy Duty (serie descendente, isométrico final o excéntricas lentas), que da el '
      + 'estímulo de alta intensidad con poco volumen. Alternar empuje, pierna y tirón deja descansar cada grupo varios días. Filosofía: poco volumen, mucha intención. Cada serie tiene un porqué y un número que superar; no hay series de relleno. Si una sesión no mejora nada, es que faltó descanso, no series.',
    comoSeHace: 'Rota los cuatro días en orden, entrenando en días alternos o cuando el mapa de recuperación lo permita. En cada '
      + 'ejercicio haz primero la serie Bilbo con el peso del día del ciclo, y justo después la de intensidad. El cardio del final es '
      + 'opcional. Antes de empezar, pon en la ficha de cada ejercicio el peso inicial de su ciclo Bilbo.',
    dias: [
      { nombre: 'Día 1: empuje', ejercicios: [
        e('Press de banca', [bilbo, dropSet(6, 8)]),
        e('Fondos de tríceps', [bilbo, dropSet(6, 8)]),
        e('Press militar', [bilbo, dropSet(8, 10)]),
        e('Crunch abdominal', [bilbo, excentricas(12, 15)]),
        e('Cardio', [libre], { opcional: true }),
      ] },
      { nombre: 'Día 2: pierna', ejercicios: [
        e('Sentadilla', [bilbo, dropSet(6, 8)]),
        e('Elevación de gemelos', [bilbo, isometrico(10, 12)]),
        e('Abductores en máquina', [bilbo, excentricas(8, 10)]),
        e('Aductores en máquina', [bilbo, dropSet(8, 10)]),
        e('Cardio', [libre], { opcional: true }),
      ] },
      { nombre: 'Día 3: tirón', ejercicios: [
        e('Remo con barra', [bilbo, dropSet(6, 8)]),
        e('Dominadas', [bilbo, dropSet(6, 8)]),
        e('Remo en polea', [bilbo, dropSet(6, 8)]),
        e('Curl martillo', [bilbo, isometrico(8, 12)]),
        e('Pájaros con mancuernas', [bilbo, isometrico(10, 12)]),
        e('Cardio', [libre], { opcional: true }),
      ] },
      { nombre: 'Día 4: pierna y cadena posterior', ejercicios: [
        e('Peso muerto', [bilbo, dropSet(6, 8)]),
        e('Curl femoral tumbado', [bilbo, dropSet(8, 10)]),
        e('Prensa de piernas', [bilbo, dropSet(8, 10)]),
        e('Cardio', [libre], { opcional: true }),
      ] },
    ],
  },
  {
    id: 'heavy-duty-acondicionamiento',
    nombre: 'Heavy Duty 1: acondicionamiento',
    autor: 'Mike Mentzer, «Heavy Duty»',
    resumen: 'Cuerpo entero, una serie por ejercicio de 15 a 20 repeticiones, sin llegar al fallo. Unas tres semanas.',
    porQue: 'Mentzer propone empezar aprendiendo bien la técnica de los básicos y acostumbrar el cuerpo al esfuerzo antes de '
      + 'entrenar a la máxima intensidad. Una sola serie por ejercicio y sin fallo: debes acabar algo cansado, no agotado. Filosofía de Mentzer: entrenar es un estímulo, no un fin; el músculo crece descansando. Antes de llegar al fallo hay que ganarse el derecho a hacerlo con técnica limpia.',
    comoSeHace: 'Tres días por semana, en días alternos. Una serie de 15 a 20 repeticiones por ejercicio, parando antes del fallo. '
      + 'Tras unas tres semanas, pasa a «Heavy Duty 2».',
    dias: [
      { nombre: 'Cuerpo entero', ejercicios: [
        e('Sentadilla', [sinFallo()]), e('Curl femoral tumbado', [sinFallo()]), e('Elevación de gemelos', [sinFallo()]),
        e('Pullover en polea', [sinFallo()]), e('Jalón al pecho', [sinFallo()]), e('Press de banca', [sinFallo()]),
        e('Press militar', [sinFallo()]), e('Press francés', [sinFallo()]), e('Curl de bíceps con barra', [sinFallo()]),
        e('Crunch abdominal', [sinFallo()]),
      ] },
    ],
  },
  {
    id: 'heavy-duty-cuerpo-entero',
    nombre: 'Heavy Duty 2: cuerpo entero al fallo',
    autor: 'Mike Mentzer, «Heavy Duty»',
    resumen: 'Cuerpo entero, una sola serie por ejercicio hasta el fallo, en menos de 40 minutos.',
    porQue: 'La idea central de Mentzer: el estímulo para crecer lo da la intensidad (llegar al fallo), no la cantidad de series. '
      + 'Una serie bien hecha basta, y el resto del tiempo es para recuperarse. Filosofía: una sola serie al fallo por ejercicio, exacta y sin engañarse, seguida de días de descanso completos. Más series no añaden estímulo, solo restan recuperación.',
    comoSeHace: 'Días alternos, tres veces por semana; si en dos o tres semanas no progresas, baja a dos. Sentadilla y pullover se '
      + 'hacen seguidos, sin descanso entre ellos (superserie). Descansa lo justo para recuperar el aliento entre ejercicios.',
    dias: [
      { nombre: 'Cuerpo entero', ejercicios: [
        e('Sentadilla', [alFallo(12, 20)], { nota: 'Superserie con el pullover' }), e('Pullover en polea', [alFallo()]),
        e('Curl femoral tumbado', [alFallo()]), e('Elevación de gemelos', [alFallo(10, 15)]), e('Peso muerto', [alFallo()]),
        e('Jalón al pecho', [alFallo()]), e('Press de banca', [alFallo()]), e('Press militar', [alFallo()]),
        e('Press francés', [alFallo()]), e('Curl de bíceps con barra', [alFallo()]), e('Crunch abdominal', [alFallo(10, 15)]),
      ] },
    ],
  },
  {
    id: 'heavy-duty-a-b',
    nombre: 'Heavy Duty 3: división A / B',
    autor: 'Mike Mentzer, «Heavy Duty»',
    resumen: 'Dos días: A (pierna, espalda y bíceps) y B (pecho, hombro, tríceps y abdomen), alternados en días alternos.',
    porQue: 'Cuando el cuerpo entero se queda corto para recuperarse, Mentzer divide el cuerpo en dos, agrupando los músculos que '
      + 'ya trabajan juntos: la pierna y la espalda se ayudan (el peso muerto carga los femorales, los remos los bíceps), y el pecho '
      + 'arrastra al hombro y al tríceps. Filosofía: el volumen semanal baja aún más y cada músculo se trabaja una vez cada varios días. Si sigues progresando con menos, es que antes sobraba.',
    comoSeHace: 'Semana 1: A, descanso, B, descanso, A, fin de semana libre. Semana 2: al revés (B, A, B). Una serie al fallo por '
      + 'ejercicio; toda la sesión en unos 20-30 minutos. Si es demasiado, quita la prensa y el peso muerto.',
    dias: [
      { nombre: 'A: pierna, espalda y bíceps', ejercicios: [
        e('Sentadilla', [alFallo(12, 20)]), e('Prensa de piernas', [alFallo(10, 15)]), e('Curl femoral tumbado', [alFallo()]),
        e('Elevación de gemelos', [alFallo(10, 15)]), e('Jalón con agarre estrecho', [alFallo()]), e('Peso muerto', [alFallo()]),
        e('Curl predicador', [alFallo()]),
      ] },
      { nombre: 'B: pecho, hombro, tríceps y abdomen', ejercicios: [
        e('Press declinado', [alFallo()]), e('Press militar', [alFallo()]), e('Fondos de tríceps', [alFallo()]),
        e('Crunch abdominal', [alFallo(10, 15)]),
      ] },
    ],
  },
  {
    id: 'heavy-duty-preagotamiento',
    nombre: 'Heavy Duty 4: preagotamiento',
    autor: 'Mike Mentzer, «Heavy Duty»',
    resumen: 'La división A / B con superseries: primero un ejercicio aislado y, sin descanso, uno compuesto del mismo músculo.',
    porQue: 'En los ejercicios compuestos a veces falla antes un músculo pequeño (el bíceps en un jalón, el tríceps en el press) que '
      + 'el grande que quieres trabajar. Cansar antes el grande con un ejercicio aislado hace que el compuesto lo lleve de verdad al fallo. Filosofía: llevar al fallo real el músculo grande, no al eslabón débil. Es la forma de Mentzer de exprimir una sola serie sin añadir más.',
    comoSeHace: 'Cada pareja se hace seguida, sin descanso entre los dos ejercicios. Una serie al fallo de cada uno. Mismo reparto de '
      + 'días que la división A / B.',
    dias: [
      { nombre: '1: pierna, espalda y bíceps', ejercicios: [
        e('Extensión de cuádriceps', [alFallo()], { nota: 'Superserie con la prensa' }), e('Prensa de piernas', [alFallo(10, 15)]),
        e('Curl femoral tumbado', [alFallo()]),
        e('Elevación de gemelos sentado', [alFallo(10, 15)], { nota: 'Superserie con los gemelos de pie' }), e('Elevación de gemelos', [alFallo(10, 15)]),
        e('Pullover en polea', [alFallo()], { nota: 'Superserie con el jalón' }), e('Jalón con agarre estrecho', [alFallo()]),
        e('Remo con barra', [alFallo()], { nota: 'Alterna con peso muerto cada sesión' }),
        e('Curl predicador', [alFallo()], { nota: 'Superserie con las dominadas supinas' }), e('Dominadas supinas', [alFallo()]),
      ] },
      { nombre: '2: pecho, hombro, tríceps y abdomen', ejercicios: [
        e('Aperturas con mancuernas', [alFallo()], { nota: 'Superserie con el press' }), e('Press declinado', [alFallo()]),
        e('Elevaciones laterales', [alFallo()], { nota: 'Superserie con el press militar' }), e('Press militar', [alFallo()]),
        e('Extensión de tríceps en polea', [alFallo()], { nota: 'Superserie con los fondos' }), e('Fondos de tríceps', [alFallo()]),
        e('Crunch abdominal', [alFallo(10, 15)], { nota: 'Superserie con el crunch inverso' }), e('Crunch inverso', [alFallo(10, 15)]),
      ] },
    ],
  },
  {
    id: 'heavy-duty-tres-dias',
    nombre: 'Heavy Duty 5: división en tres días',
    autor: 'Mike Mentzer, «Heavy Duty»',
    resumen: 'Pierna; pecho, hombro, tríceps y abdomen; espalda y bíceps. Cada grupo, una vez cada 7 a 14 días.',
    porQue: 'El último paso de Mentzer: a medida que te haces más fuerte, cada sesión cansa más y necesitas más descanso. Divide el '
      + 'cuerpo en tres y, cuando se estanca, alarga el ciclo (de 7 a 10 y luego a 14 días) en vez de añadir series. Filosofía: cuanto más fuerte, más raro entrenar. Mentzer llegó a proponer una sesión cada 4-7 días; si el peso sube en cada sesión, el descanso es el correcto.',
    comoSeHace: 'Como mucho dos series por músculo grande y una por músculo pequeño (la espalda admite tres). Empieza con lunes, '
      + 'miércoles y viernes; si te estancas, pasa a dos días por semana (lunes y jueves) siguiendo el orden de los tres días.',
    dias: [
      { nombre: 'Pierna', ejercicios: [
        e('Extensión de cuádriceps', [alFallo()]), e('Sentadilla', [alFallo(12, 20)]), e('Curl femoral tumbado', [alFallo()]),
        e('Elevación de gemelos', [alFallo(10, 15)]),
      ] },
      { nombre: 'Pecho, hombro, tríceps y abdomen', ejercicios: [
        e('Aperturas con mancuernas', [alFallo()]), e('Press declinado', [alFallo()]), e('Elevaciones laterales', [alFallo()]),
        e('Extensión de tríceps en polea', [alFallo()]), e('Fondos de tríceps', [alFallo()]), e('Crunch abdominal', [alFallo(10, 15)]),
      ] },
      { nombre: 'Espalda y bíceps', ejercicios: [
        e('Pullover en polea', [alFallo()]), e('Jalón con agarre estrecho', [alFallo()]), e('Remo con barra', [alFallo()]),
        e('Curl predicador', [alFallo()]),
      ] },
    ],
  },
  {
    id: 'ppl-bilbo-heavy-duty-3',
    version: 2,
    nombre: 'PPL Bilbo + Heavy Duty (3 días)',
    autor: 'Dan (versión anterior, noviembre de 2025)',
    resumen: 'Tres días: empuje, tirón y pierna. Cada ejercicio con una serie Bilbo y una de intensidad; unos 30-40 minutos por día.',
    porQue: 'La misma idea que la PLPL, en tres días en lugar de cuatro: la serie Bilbo (20-30 repeticiones sin llegar al fallo) '
      + 'construye la base, y la serie Heavy Duty (6-12 repeticiones con rest-pause, serie descendente, isométrico o excéntricas) da el estímulo '
      + 'intenso. En peso muerto, press, sentadilla, dominadas y fondos se para en el fallo técnico, antes de perder la postura; '
      + 'en máquinas se puede ir al fallo total. Filosofía: la misma que la de cuatro días, con una sesión menos por semana para quien tiene menos tiempo o se recupera más despacio. Cada ejercicio, una serie que construye y otra que exprime.',
    comoSeHace: 'Rota empuje, tirón y pierna. En cada ejercicio, primero la serie Bilbo y después la de intensidad. Subida explosiva '
      + 'y bajada lenta en todo. El día de pierna empieza con unos saltos para calentar. Correr 10-20 minutos al final es opcional.',
    dias: [
      { nombre: 'Día 1: empuje', ejercicios: [
        e('Press de banca', [bilbo, restPause(6, 8)], { nota: 'Heavy Duty con rest-pause; fallo técnico' }),
        e('Elevaciones laterales en polea', [bilbo, dropSet(8, 10)], { nota: 'En máquina si la hay' }),
        e('Fondos de tríceps', [bilbo, alFallo(6, 8)], { nota: 'Fallo técnico, sin arriesgar' }),
        e('Extensión de tríceps en máquina', [dropSet(8, 10)], { opcional: true }),
        e('Crunch abdominal', [bilbo, excentricas(12, 15)]),
        e('Carrera', [libre], { opcional: true }),
      ] },
      { nombre: 'Día 2: tirón', ejercicios: [
        e('Peso muerto', [bilbo, alFallo(6, 8)], { nota: 'Bilbo de 15-20; fallo técnico' }),
        e('Hiperextensiones', [bilbo, isometrico(10, 12)]),
        e('Jalón al pecho', [bilbo, dropSet(6, 8)]),
        e('Remo en máquina', [bilbo, ...alternos([dropSet(6, 8)])]),
        e('Curl de bíceps en máquina', [bilbo, isometrico(8, 12)]),
        e('Pájaros con mancuernas', [bilbo, isometrico(10, 12)]),
        e('Carrera', [libre], { opcional: true }),
      ] },
      { nombre: 'Día 3: pierna', ejercicios: [
        e('Saltos al cajón', [libre], { opcional: true, nota: 'Calentamiento' }),
        e('Sentadilla', [bilbo, alFallo(6, 8)], { nota: 'Fallo técnico' }),
        e('Extensión de cuádriceps', [alFallo(12, 20)], { nota: 'A una pierna y luego a dos, peso medio' }),
        e('Curl femoral tumbado', [bilbo, ...alternos([dropSet(8, 10)])]),
        e('Abductores en máquina', [bilbo, excentricas(8, 10)]),
        e('Aductores en máquina', [bilbo, dropSet(8, 10)]),
        e('Elevación de gemelos', [bilbo, ...alternos([isometrico(10, 12)])]),
        e('Carrera', [libre], { opcional: true }),
      ] },
    ],
  },
  {
    id: 'flexibilidad-tres-sesiones',
    tipo: 'flexibilidad',
    version: 2,
    nombre: 'Flexibilidad: tres sesiones',
    autor: 'Propuesta de la app, basada en una rutina personal de fisioterapia',
    resumen: 'Tres sesiones cortas (10-12 minutos) de estiramientos y movilidad: cadera y pierna, cuello y espalda, y aperturas de cadera y hombro. Cada una con una prueba para medir el progreso.',
    porQue: 'La flexibilidad mejora a medio plazo, no en cada sesión: por eso cada sesión lleva un ejercicio de prueba que se mide cada dos o tres '
      + 'semanas. Se mezclan tres cosas: estirar con contracción y relajación (PIR), movilizar el nervio con deslizamientos suaves y ganar rango '
      + 'con fuerza al final del recorrido. Nunca hasta el dolor eléctrico ni el hormigueo: solo tensión.',
    comoSeHace: 'Dos o tres días por semana, mejor el mismo día que la fuerza (por la tarde) o con dos días de separación. Cada ejercicio, el tiempo '
      + 'indicado; en los de PIR, empuja 5 segundos, relaja y gana recorrido 5 segundos. En los de prueba, apunta cuántas repeticiones limpias o '
      + 'a qué distancia llegas con la escala de la mano. Si algo duele de verdad, para y consúltalo.',
    dias: [
      { nombre: 'A: cadera y pierna', ejercicios: [
        e('Deslizamiento neural ciático', porLado([t(30)])),
        e('Estiramiento de glúteo en figura de 4 (Supta Kapotasana)', porLado([t(45)]), { nota: 'Con PIR: empuja 5 s, relaja 5 s' }),
        e('Rotación 90/90', [t(120)], { nota: 'Prueba: cuenta las rotaciones limpias sin manos' }),
        e('Rotación tibial con rodilla flexionada', porLado([t(30)])),
        e('Estiramiento de gemelo en pared', porLado([t(30)])),
        e('Estiramiento de sóleo en pared', porLado([t(30)])),
      ] },
      { nombre: 'B: cuello y espalda', ejercicios: [
        e('Rotación torácica en cuadrupedia', porLado([t(30)])),
        e('Estiramiento de trapecio superior', porLado([t(45)]), { nota: 'Con PIR: empuja la cabeza contra la mano 5 s, relaja 5 s' }),
        e('Deslizamiento neural cervical', porLado([t(30)]), { nota: 'Para si notas hormigueo' }),
        e('Gato-camello (Marjaryasana-Bitilasana)', [t(90)]),
        e('Puente por fases', [t(90)], { nota: 'Prueba: apunta la fase (1 a 4) y el tiempo' }),
      ] },
      { nombre: 'C: aperturas de cadera y hombro', ejercicios: [
        e('Estiramiento de aductores en mariposa (Baddha Konasana)', [t(90)], { nota: 'Con PIR' }),
        e('Postura del sastre, apertura lateral (Upavistha Konasana)', [t(60)], { nota: 'Prueba: distancia rodilla-suelo con la escala de la mano' }),
        e('Estiramiento de psoas en zancada (Anjaneyasana)', porLado([t(45)]), { nota: 'Mete la cola antes de avanzar la cadera' }),
        e('Zancada hacia el split frontal (Hanumanasana)', porLado([t(30)]), { nota: 'Prueba: distancia de la ingle al suelo, con cada pierna delante' }),
        e('Rotación externa de hombro con banda', porLado([t(30)])),
        e('Rotación interna de hombro con toalla', porLado([t(30)])),
      ] },
    ],
  },
  {
    id: 'movilidad-para-meditar',
    tipo: 'flexibilidad',
    version: 3,
    nombre: 'Movilidad para sentarse a meditar',
    autor: 'Propuesta de la app, basada en una rutina personal',
    resumen: 'Dos rutinas de 15 minutos (cuello y espalda; piernas y caderas) y una progresión de tobillos para poder sentarse sobre los talones sin dolor.',
    porQue: 'Sentarse a meditar pide cuello y espalda libres, caderas que rotan y tobillos que se doblan. Cada rutina va en tres pasos: movilidad '
      + 'activa para calentar, fuerza en el final del recorrido para que el rango se quede, y estiramientos pasivos al final. La progresión de '
      + 'tobillos usa un ladrillo bajo los glúteos: alto hasta aguantar 10 minutos sin molestias, luego medio, luego bajo.',
    comoSeHace: 'En casa. A y B en días alternos, y la de tobillos 3-4 veces por semana (5 minutos). Lo que va por lado lleva una serie por lado. Nunca con dolor por encima de 3 sobre 10. Mide cada '
      + 'dos semanas: minutos sentado sin dolor, distancia pie-pared en el tobillo, y con qué apoyo (alto, medio, bajo, sin ladrillo).',
    dias: [
      { nombre: 'A: cuello, espalda y caderas', ejercicios: [
        e('Retracción cervical (chin tuck)', reps(2, 10)),
        e('Flexión lateral de cuello activa', porLado(reps(1, 8)), { nota: 'Oreja al hombro sin subir el hombro' }),
        e('Extensión torácica en silla', reps(2, 8), { nota: 'Sentado, manos detrás de la cabeza: arquea la parte alta de la espalda sobre el borde del respaldo y vuelve' }),
        e('Gato-camello (Marjaryasana-Bitilasana)', [t(60)], { nota: 'Manos y rodillas quietas: solo se mueve la espalda, redonda arriba y hundida abajo, todo lo que dé cómodo' }),
        e('Isométrico de cuello hacia delante', [t(30)], { nota: '3 × 10 s: mano en la frente, empuja sin mover la cabeza' }),
        e('Isométrico de cuello hacia atrás', [t(30)], { nota: '3 × 10 s: manos en la nuca, empuja sin mover la cabeza' }),
        e('Isométricos de cuello', porLado([t(30)]), { nota: 'Hacia el lado: 3 × 10 s con la mano en la sien, empuja sin mover la cabeza' }),
        e('Elevaciones Y-T-W', reps(2, 8), { nota: 'De pie, inclinado hacia delante con la espalda recta (bisagra de cadera), para que los brazos suban contra la gravedad. 8 de cada letra' }),
        e('Cobra en el suelo (Bhujangasana)', [t(30)]),
        e('Estiramiento de trapecio superior', porLado([t(30)])),
        e('Estiramiento del elevador de la escápula', porLado([t(30)])),
        e('Niño o embrión (Balasana)', [t(45)]),
      ] },
      { nombre: 'B: piernas para sentarse', ejercicios: [
        e('CARs de cadera', porLado([t(30)]), { nota: 'A cuatro patas: 5 círculos grandes y lentos con la rodilla' }),
        e('Rotación 90/90', porLado(reps(1, 6, 8)), { nota: 'Transiciones; el lado es hacia el que empiezas' }),
        e('Tobillo con rodilla a la pared', porLado(reps(1, 10))),
        e('Sentadilla cosaca', reps(2, 6), { nota: 'Alternando lados: 6 por lado en cada serie' }),
        e('Sentadilla búlgara', porLado(reps(2, 6)), { nota: 'Profunda, sin peso' }),
        e('Elevación de gemelos', reps(2, 10), { nota: 'Pausa de 2 s abajo' }),
        e('Estiramiento de aductores en mariposa (Baddha Konasana)', [t(40)]),
        e('Estiramiento del sofá (couch stretch)', porLado([t(40)]), { nota: 'Cojín bajo la rodilla' }),
        e('Estiramiento de glúteo en paloma (Eka Pada Rajakapotasana)', porLado([t(40)])),
      ] },
      { nombre: 'Tobillos (5 min)', ejercicios: [
        e('Flexión y extensión de dedos del pie', series(1, 10, 15)),
        e('Isométrico de flexión plantar', [t(30)], { nota: '3 × 10 s' }),
        e('Estiramiento del empeine', [t(30)]),
        e('Héroe tendido (Supta Virasana)', [t(45)], { nota: 'Con ladrillo: alto, luego medio, luego bajo' }),
        e('Estiramiento de los dedos del pie', [t(30)]),
      ] },
    ],
  },
  {
    id: 'flexibilidad-spagat-y-hombro',
    tipo: 'flexibilidad',
    version: 3,
    nombre: 'Flexibilidad: spagat y hombro',
    autor: 'Dan (investigación «Elasticidad», 10-2026)',
    resumen: 'Una sesión de unos 20 minutos para casa, cuatro veces por semana: primero el spagat frontal (isquios y psoas), '
      + 'después la apertura lateral, el pectoral y el dorsal. Con los estiramientos cortos de los descansos del gimnasio, '
      + 'cada músculo suma unos 10 minutos por semana.',
    porQue: 'Estirar con regularidad mejora el rango con un efecto grande (Konrad 2024), y estático y contraer-relajar rinden igual. '
      + 'Lo primero que cambia es la tolerancia del sistema nervioso; el músculo se ablanda después, con semanas de tensión clara '
      + '(Freitas 2018; Takeuchi 2023). La ganancia se estanca hacia los 10 minutos por semana y músculo (Ingram 2025), aunque el '
      + 'metaanálisis más grande no ve diferencias por dosis dentro de lo habitual (Konrad 2024). 30-45 segundos por serie bastan '
      + '(Bandy 1994) y el dolor no da más rango (Muanjai 2017). Isquios con la espalda recta: con la espalda redonda el isquio gana '
      + 'menos (Sullivan 1992). El frontal va primero porque es la meta principal; el lateral puede toparse con el hueso en las '
      + 'caderas con choque femoroacetabular (Tannast 2007). Decisiones prácticas sin estudio propio: el orden, el reparto de series '
      + 'y los 10 segundos entre series.',
    comoSeHace: 'En casa, cuatro veces por semana, por la tarde (nunca en la primera hora tras levantarte), mejor tras moverte un poco. '
      + 'Intensidad 6-7 sobre 10, en la panza del músculo, nunca en la articulación. El descanso entre series solo sirve para cambiar de '
      + 'lado o de postura: déjalo en 0-10 s o sáltatelo. Bastan series de 30-45 s; no hace falta llegar a 2 minutos. Si un día vas justo, recorta el final, no el principio. Para y consúltalo si notas un pinchazo profundo en la '
      + 'ingle, dolor junto al hueso de la nalga, hormigueo por la pierna o un chasquido. La prueba del final es opcional: hazla una '
      + 'vez al mes, a la misma hora, una vez con cada pierna, y apunta los centímetros de la ingle al suelo.',
    dias: [
      { nombre: 'Spagat y hombro', ejercicios: [
        e('CARs de cadera', porLado([t(30)]), { nota: 'Calentar: 3 círculos grandes y lentos' }),
        e('Estiramiento de isquios (Janu Sirsasana)', porLado(veces(3, t(45))),
          { nota: 'Pecho hacia la rodilla con la espalda recta, sin redondear' }),
        e('Estiramiento de psoas en zancada (Anjaneyasana)', porLado(veces(3, t(45))),
          { nota: 'Rodilla de atrás apoyada en el suelo sobre un cojín doblado, empeine '
            + 'apoyado; tronco erguido, manos en la rodilla de delante o en una silla. Mete la cola, aprieta el glúteo y avanza la cadera '
            + 'solo un poco. Que tire del cuádriceps es normal; dolor en la rodilla no: más cojín o menos avance' }),
        e('Postura del sastre, apertura lateral (Upavistha Konasana)', [t(60), t(60)],
          { nota: 'Sentado en el suelo, nunca de pie. Sobre un cojín o una toalla doblada, piernas abiertas solo hasta donde den sin '
            + 'forzar: menos de 90° entre las piernas es normal al empezar. Rodillas al techo, manos detrás o delante; inclina el tronco '
            + 'desde la cadera solo si mantienes la espalda recta' }),
        e('Estiramiento de pectoral en el marco de la puerta', porLado(veces(3, t(45))),
          { nota: 'Brazo a 90°; sin dolor de hombro' }),
        e('Estiramiento de dorsal', [t(60), t(60)], { nota: 'Es el de hombro por encima de la cabeza. De rodillas, cadera encima de las '
          + 'rodillas (no sentado en los talones: eso sería Balasana), brazos estirados al frente o codos en una silla; deja caer el pecho' }),
        e('Zancada hacia el split frontal (Hanumanasana)', porLado([t(30)]),
          { opcional: true, nota: 'Prueba, una vez al mes, con cada pierna delante. No es hacer el spagat: '
            + 'zancada lo más baja que puedas, manos en dos sillas o ladrillos, el pie de delante desliza. Mide con cinta métrica de la '
            + 'ingle al suelo; vale cualquier altura' }),
      ] },
    ],
  },
  {
    id: 'cardio-tres-dias',
    tipo: 'cardio',
    nombre: 'Cardio: tres días',
    autor: 'Propuesta de la app',
    resumen: 'Tres días a la semana: uno suave y largo (caminar o bici), uno de intervalos cortos (Tabata) y uno de carrera continua. '
      + 'Para llegar a los 150 minutos semanales que recomienda la OMS sin aburrirse.',
    porQue: 'La OMS recomienda de 150 a 300 minutos de actividad moderada a la semana, o de 75 a 150 de intensa, y fuerza 2 o más días por semana. Mezclar un día '
      + 'largo y suave con uno corto e intenso da lo mismo con menos tiempo y cansa menos que hacer siempre igual. Los intervalos '
      + '(HIIT) mejoran la capacidad cardíaca en pocos minutos; el suave se recupera rápido y suma minutos.',
    comoSeHace: 'El día suave, a un ritmo en el que puedas hablar. El día de intervalos, abre el cronómetro de la app (⏱ Intervalos) '
      + 'y elige Tabata: 20 segundos a tope y 10 de descanso, ocho veces; si es demasiado, 30/30. El día de carrera, continuo y cómodo; '
      + 'apunta minutos y, si quieres, kilómetros. Si vienes de cero, empieza por el día suave dos semanas.',
    dias: [
      { nombre: 'Suave y largo', ejercicios: [e('Caminar', [t(1800)], { nota: 'O bicicleta. Ritmo de poder hablar' })] },
      { nombre: 'Intervalos', ejercicios: [
        e('Caminar', [t(300)], { nota: 'Calentar 5 minutos' }),
        e('Tabata', [t(240)], { nota: 'Con el cronómetro: 20 s a tope, 10 s de descanso, ocho veces' }),
        e('Caminar', [t(300)], { nota: 'Soltar 5 minutos' }),
      ] },
      { nombre: 'Carrera continua', ejercicios: [e('Carrera', [t(1200)], { nota: 'Cómodo; si te ahogas, anda y sigue' })] },
    ],
  },
  {
    id: 'cinco-por-cinco',
    nombre: '5×5 clásico',
    autor: 'Programa clásico de fuerza (Bill Starr, StrongLifts)',
    resumen: 'Tres días por semana alternando A y B. Cinco series de cinco en los básicos con barra; cada sesión, un poco más de peso.',
    porQue: 'La progresión lineal más simple que existe: si hoy haces las cinco series de cinco, la próxima vez llevas 2,5 kg más. '
      + 'Funciona porque al principio la fuerza sube de sesión en sesión; cuando deja de hacerlo, se baja un 10 % y se vuelve a subir. '
      + 'Filosofía: pocos ejercicios, muy repetidos, con barra, y una regla que cabe en una frase. No busca sensación de trabajo, sino '
      + 'que el número de la barra suba.',
    comoSeHace: 'Lunes, miércoles y viernes, alternando A y B. Empieza con un peso cómodo (la barra sola si hace falta): el programa '
      + 'lo sube solo. Pon el peso inicial de cada ejercicio en su ficha, en «Programa». Descansa de 3 a 5 minutos entre series pesadas.',
    dias: [
      { nombre: 'A', ejercicios: [
        e('Sentadilla', [programa('5x5')]), e('Press de banca', [programa('5x5')]), e('Remo con barra', [programa('5x5')]),
      ] },
      { nombre: 'B', ejercicios: [
        e('Sentadilla', [programa('5x5')]), e('Press militar', [programa('5x5')]),
        e('Peso muerto', [programa('5x5')], { nota: 'Vale con una sola serie de cinco; las demás, opcionales' }),
      ] },
    ],
  },
  {
    id: 'cinco-tres-uno',
    version: 2,
    nombre: '5/3/1 (Wendler)',
    autor: 'Jim Wendler, resumido con palabras propias',
    resumen: 'Cuatro días por semana, uno por básico: sentadilla, press de banca, peso muerto y press militar. Ciclos de cuatro semanas.',
    porQue: 'Wendler parte de un «máximo de entrenamiento» (el 90 % de tu 1RM) y programa tres series por sesión a porcentajes '
      + 'que suben cada semana: de 5, de 3 y de 5/3/1, y una cuarta de descarga. La última serie de cada día es «las que puedas». '
      + 'Cada ciclo el máximo sube 2,5 kg. Filosofía: progresar despacio y sin fallar; empezar más ligero de lo que '
      + 'crees y ganar en meses lo que otros pierden por ir demasiado rápido. Los accesorios son secundarios: se eligen para cubrir '
      + 'lo que el básico no toca.',
    comoSeHace: 'Un básico por día. En la ficha de cada uno, en «Programa», pon tu máximo de entrenamiento (la app te enseña el 90 % '
      + 'de tu 1RM estimado). Después del básico, dos o tres accesorios a 3 series de 8-12. Al acabar la semana de descarga, el '
      + 'programa pasa solo al ciclo siguiente.',
    dias: [
      { nombre: 'Press militar', ejercicios: [
        e('Press militar', [programa('531')]), e('Dominadas', series(3, 6, 10)), e('Fondos de tríceps', series(3, 8, 12)),
      ] },
      { nombre: 'Peso muerto', ejercicios: [
        e('Peso muerto', [programa('531')]), e('Zancadas', series(3, 8, 12)), e('Elevaciones de piernas', series(3, 10, 15)),
      ] },
      { nombre: 'Press de banca', ejercicios: [
        e('Press de banca', [programa('531')]), e('Remo con mancuerna', alternos(series(3, 8, 12))), e('Press inclinado con mancuernas', series(3, 8, 12)),
      ] },
      { nombre: 'Sentadilla', ejercicios: [
        e('Sentadilla', [programa('531')]), e('Curl femoral tumbado', series(3, 10, 12)), e('Plancha', series(3, 30, 60)),
      ] },
    ],
  },
  {
    id: 'pesos-libres-cualquier-gimnasio',
    nombre: 'Sin máquinas: igual en cualquier gimnasio',
    autor: 'Propuesta de la app',
    resumen: 'Cuerpo entero en dos días alternos (A y B), solo con barra, mancuernas y tu peso: los kilos valen en cualquier gimnasio.',
    porQue: 'Una barra olímpica y unas mancuernas pesan lo mismo en todas partes; una máquina, no. Si cambias de gimnasio o viajas, '
      + 'esta rutina no pierde el hilo de tu progresión. Los básicos con barra además trabajan mucho músculo a la vez. Filosofía: lo portátil. Un programa que no dependa de ninguna máquina, para que el historial y la progresión sigan aunque cambies de sitio, apoyado en los básicos con barra, que enseñan a moverse con cargas.',
    comoSeHace: 'Tres días por semana alternando A y B (A-B-A una semana, B-A-B la siguiente). Tres series por ejercicio con doble '
      + 'progresión, acabando a 1-3 del fallo. Estos ejercicios quedan como «igual en todos los sitios».',
    dias: [
      { nombre: 'A', ejercicios: [
        e('Sentadilla', series(3, 5, 8)), e('Press de banca', series(3, 6, 10)), e('Remo con barra', series(3, 8, 10)),
        e('Press militar', series(3, 6, 10)), e('Curl de bíceps con barra', series(2, 8, 12)), e('Plancha', series(2, 30, 60)),
      ] },
      { nombre: 'B', ejercicios: [
        e('Peso muerto', series(3, 4, 6)), e('Press inclinado con mancuernas', series(3, 8, 12)), e('Dominadas', series(3, 5, 10)),
        e('Zancadas', series(3, 8, 12)), e('Elevaciones laterales', series(3, 12, 15)), e('Press francés', series(2, 10, 12)),
      ] },
    ],
  },
  {
    id: 'cuerpo-entero-principiantes',
    nombre: 'Cuerpo entero para principiantes',
    autor: 'Propuesta de la app',
    resumen: 'Tres días por semana, dos sesiones alternas (A y B), ejercicios sencillos y seguros para aprender la técnica.',
    porQue: 'Al empezar, entrenar cada músculo tres veces por semana con poco volumen es lo que más rápido hace progresar, y repetir '
      + 'los mismos movimientos ayuda a aprenderlos. Las máquinas y las mancuernas son más fáciles de controlar que la barra libre. Filosofía: aprender antes que cargar. En los primeros meses casi cualquier cosa funciona; lo que marca la diferencia es la técnica, la constancia y no lesionarse. Por eso hay pocos ejercicios, sencillos y repetidos.',
    comoSeHace: 'Alterna A y B en días no seguidos. Dos o tres series de 8 a 12 repeticiones, dejando 2 en recámara: no hace falta '
      + 'llegar al fallo. Cuando hagas 12 en todas las series, sube un poco el peso. Tras unos meses, pasa a una rutina de 4 días.',
    dias: [
      { nombre: 'A', ejercicios: [
        e('Sentadilla goblet', series(3, 8, 12)), e('Press de banca con mancuernas', series(3, 8, 12)), e('Jalón al pecho', series(3, 8, 12)),
        e('Peso muerto rumano', series(2, 8, 12)), e('Press de hombro con mancuernas', series(2, 8, 12)), e('Plancha', series(2, 20, 45)),
      ] },
      { nombre: 'B', ejercicios: [
        e('Prensa de piernas', series(3, 10, 12)), e('Flexiones', series(3, 5, 15)), e('Remo en polea', series(3, 8, 12)),
        e('Puente de glúteo', series(2, 10, 15)), e('Curl femoral tumbado', series(2, 10, 12)), e('Bicho muerto', series(2, 8, 12)),
      ] },
    ],
  },
  {
    id: 'calistenia-cuerpo-entero',
    version: 2,
    nombre: 'Calistenia: cuerpo entero',
    autor: 'Propuesta de la app',
    resumen: 'Solo con tu peso, una barra y unas paralelas (o un parque). Tres días por semana.',
    porQue: 'Para entrenar en casa o en la calle sin material. Se progresa haciendo más repeticiones y pasando a variantes más '
      + 'difíciles: de flexiones con rodillas a flexiones, de remo invertido a dominadas, de sentadilla a sentadilla a una pierna. Filosofía: el cuerpo como única carga. Se progresa cambiando la palanca (la variante), no el peso; enseña control corporal y sirve en cualquier sitio.',
    comoSeHace: 'Tres días no seguidos, la misma sesión. Tres series por ejercicio a 1-2 del fallo. Si una variante te sale con más de '
      + '15 repeticiones, pasa a la siguiente; si no llegas a 5, usa la anterior (con rodillas, con goma, con apoyo).',
    dias: [
      { nombre: 'Cuerpo entero', ejercicios: [
        e('Flexiones', series(3, 5, 15), { nota: 'Con rodillas si no llegas a 5' }),
        e('Dominadas', series(3, 3, 10), { nota: 'O remo invertido si aún no salen' }),
        e('Sentadilla a una pierna', alternos(series(3, 5, 12)), { nota: 'Empieza con sentadilla normal o con apoyo' }),
        e('Fondos de tríceps', series(3, 5, 12), { nota: 'En paralelas o en banco' }),
        e('Remo invertido', series(3, 8, 15)),
        e('Puente de glúteo', series(3, 10, 20)),
        e('Elevaciones de piernas', series(3, 6, 15)),
        e('Plancha', series(2, 30, 60)),
      ] },
    ],
  },
];

// Plantilla de serie para un ejercicio a partir de la forma de la plantilla.
function planDesde(ej, forma) {
  const plan = planDesdeSinLado(ej, forma);
  if (forma.lado) plan.lado = forma.lado;
  return plan;
}

function planDesdeSinLado(ej, forma) {
  if (forma.tipo === 'bilbo') {
    const plan = serieNuevaPlantilla(ej, { tipo: 'bilbo', progresion: 'bilbo' });
    const generador = { inicial: ej.carga.tipo === 'ninguna' ? 10 : 20, incremento: ej.carga.tipo === 'ninguna' ? 1 : 2.5, cada: 1 };
    plan.progresion.ciclos = [{ n: 1, inicio: null, fin: null, generador,
      escalera: generarEscalera({ ...generador, dias: DIAS_CICLO_POR_DEFECTO }) }];
    plan.progresion.cicloActual = 1;
    return plan;
  }
  const plan = serieNuevaPlantilla(ej, { tipo: forma.tipo, tecnicas: forma.tecnicas ?? [], progresion: forma.progresion ?? 'libre' });
  if (forma.objetivo) {
    plan.objetivoEsfuerzo = forma.objetivo;
    if (plan.progresion.tipo === 'carga') plan.progresion.objetivoEsfuerzo = [...forma.objetivo];
  }
  if (plan.progresion.tipo === 'programa') {
    plan.progresion.programa = forma.programa;
    plan.progresion.inicial = forma.inicial ?? null;
    plan.progresion.incremento = 2.5;
  }
  return plan;
}

// Qué ejercicios nuevos crearía la plantilla (los que no tienes ya).
// Tipo de una rutina prehecha ('fuerza', 'cardio' o 'flexibilidad').
export const tipoDePlantilla = (p) => p.tipo ?? 'fuerza';

// Tipo de una rutina tuya, por lo que hay en ella.
export function tipoDeRutina(datos, rutina) {
  const grupos = rutina.dias.flatMap((d) => d.ejercicios.map((x) => datos.ejercicios.find((e) => e.id === x.ejercicioId)?.grupo));
  const n = (lista) => grupos.filter((g) => lista.includes(g)).length;
  const flex = n(['estiramiento', 'movilidad', 'yoga']), cardio = n(['cardio']);
  if (flex > grupos.length / 2) return 'flexibilidad';
  if (cardio > grupos.length / 2) return 'cardio';
  return 'fuerza';
}

export function ejerciciosNuevos(datos, plantilla) {
  const tuyos = new Set(datos.ejercicios.filter((x) => !x.archivado).map((x) => normalizar(x.nombre)));
  const nombres = [...new Set(plantilla.dias.flatMap((d) => d.ejercicios.map((x) => x.nombre)))];
  return nombres.filter((n) => !tuyos.has(normalizar(n)));
}

// Los días de una prehecha escrita como lista (no como texto), con las series
// de cada ejercicio tal como las pide. Si el ejercicio es nuevo o no tenía
// series, pasan a ser las suyas; si ya las tenía, son «solo de esta rutina»
// (y reutilizarPlanes cambia después las que ya tenías iguales por las tuyas,
// para no perder «la última vez»). Cambia `datos`.
function diasDePlantilla(datos, plantilla, rutinaId) {
  const porNombre = new Map(datos.ejercicios.filter((x) => !x.archivado && !x.borrado).map((x) => [normalizar(x.nombre), x]));
  const ejercicioPara = (nombre) => {
    const clave = normalizar(nombre);
    if (porNombre.has(clave)) return porNombre.get(clave);
    const base = CATALOGO.find((c) => normalizar(c.nombre) === clave) ?? { nombre, grupo: '', material: '' };
    const nuevo = ejercicioDesdeCatalogo(base);
    nuevo.series = [];
    datos.ejercicios.push(nuevo);
    porNombre.set(clave, nuevo);
    return nuevo;
  };
  return plantilla.dias.map((dia) => ({ id: nuevoId('dia'), nombre: dia.nombre, ejercicios: dia.ejercicios.map((item) => {
    const ej = ejercicioPara(item.nombre);
    ej.series ??= [];
    const propias = !ej.series.some((p) => !p.soloRutina);
    const planes = item.series.map((forma) => ({ ...planDesde(ej, forma), soloRutina: propias ? null : rutinaId }));
    ej.series.push(...planes);
    return { ejercicioId: ej.id, opcional: Boolean(item.opcional), series: propias ? null : planes.map((p) => p.id), nota: item.nota ?? null };
  }) }));
}

// Las rutinas de estirar, movilidad y yoga se hacen en casa: la de casa si la tienes.
const sedeDeCasa = (datos) => (datos.sedes ?? []).find((x) => !x.archivado && x.tipo === 'casa')?.id ?? null;

// Añade la rutina y los ejercicios que falten. Cambia `datos` (dentro de
// estado.cambiar) y devuelve el id de la rutina nueva.
export function anadirPlantilla(datos, plantilla) {
  if (plantilla.texto) {
    const id = crearRutinaDesdeTexto(datos, analizarRutina(plantilla.texto), { nombre: plantilla.nombre });
    const rutina = datos.rutinas.find((r) => r.id === id);
    rutina.plantilla = plantilla.id;
    rutina.versionPlantilla = plantilla.version ?? 1;
    rutina.descripcion = `${plantilla.porQue}\n\n${plantilla.comoSeHace}`;
    if (tipoDePlantilla(plantilla) === 'flexibilidad') rutina.sedeId = sedeDeCasa(datos);
    return id;
  }
  const rutina = {
    id: nuevoId('rut'), nombre: plantilla.nombre, activa: true, diasSemana: null,
    sedeId: tipoDePlantilla(plantilla) === 'flexibilidad' ? sedeDeCasa(datos) : null, plantilla: plantilla.id,
    versionPlantilla: plantilla.version ?? 1,
    descripcion: `${plantilla.porQue}\n\n${plantilla.comoSeHace}`,
  };
  rutina.dias = diasDePlantilla(datos, plantilla, rutina.id);
  reutilizarPlanes(datos, rutina);
  datos.rutinas.push(rutina);
  return rutina.id;
}

// ¿Hay una versión más nueva de la prehecha de la que salió esta rutina?
export function plantillaNueva(rutina) {
  const p = PLANTILLAS.find((x) => x.id === rutina?.plantilla);
  return p && (rutina.versionPlantilla ?? 1) < (p.version ?? 1) ? p : null;
}

// Rehace los días de la rutina con la última versión de su prehecha. Los
// entrenamientos hechos no se tocan; los ejercicios que ya tienes se usan
// tal cual (con su historial) y las series «solo de esta rutina» que ya no
// sirven se retiran (las que tienen historial se quedan, sin salir).
// Al actualizar una rutina, las series que no cambian siguen siendo las de
// antes (con su «última vez» y su ciclo en curso): si una serie nueva es igual
// que una vieja del mismo ejercicio (la suya o una retirada con historial),
// se usa la vieja y la nueva sobra.
const firmaPlan = (p) => JSON.stringify([p.tipo, Boolean(p.calentamiento), p.progresion?.tipo ?? null, p.progresion?.preset ?? null,
  p.progresion?.objetivoEsfuerzo ?? p.objetivoEsfuerzo ?? null, p.progresion?.recamaraMin ?? null, p.progresion?.porRM ?? null,
  [...(p.tecnicas ?? [])].sort()]);
function reutilizarPlanes(datos, rutina) {
  const usados = new Set();
  for (const dia of rutina.dias) {
    for (const item of dia.ejercicios) {
      const ej = datos.ejercicios.find((e) => e.id === item.ejercicioId);
      if (!ej || !Array.isArray(item.series)) continue;
      item.series = item.series.map((pid) => {
        const nuevo = ej.series.find((p) => p.id === pid);
        if (!nuevo || nuevo.soloRutina !== rutina.id) return pid;
        // Vale una del mismo lado o, si no, una sin lado (que pasa a tenerlo).
        const sirve = (q, lado) => q !== nuevo && !usados.has(q.id) && (q.soloRutina === 'retirada' || !q.soloRutina)
          && firmaPlan(q) === firmaPlan(nuevo) && (q.lado ?? null) === lado;
        const viejo = ej.series.find((q) => sirve(q, nuevo.lado ?? null)) ?? (nuevo.lado ? ej.series.find((q) => sirve(q, null)) : null);
        if (!viejo) return pid;
        usados.add(viejo.id);
        if (nuevo.lado) viejo.lado = nuevo.lado;
        if (viejo.soloRutina === 'retirada') viejo.soloRutina = rutina.id;
        ej.series = ej.series.filter((p) => p.id !== nuevo.id);
        return viejo.id;
      });
    }
  }
}

export function actualizarDesdePlantilla(datos, rutinaId) {
  const rutina = datos.rutinas.find((r) => r.id === rutinaId);
  const plantilla = PLANTILLAS.find((x) => x.id === rutina?.plantilla);
  if (!rutina || !plantilla) return false;
  const conHistorial = new Set(datos.sesiones.flatMap((s) => s.ejercicios.flatMap((x) => x.series.map((y) => y.planId))));
  for (const ej of datos.ejercicios) {
    ej.series = (ej.series ?? []).filter((p) => p.soloRutina !== rutina.id || conHistorial.has(p.id));
    for (const p of ej.series) if (p.soloRutina === rutina.id) p.soloRutina = 'retirada';
  }
  let dias;
  if (plantilla.texto) {
    const idTemporal = crearRutinaDesdeTexto(datos, analizarRutina(plantilla.texto), { nombre: rutina.nombre });
    dias = datos.rutinas.find((r) => r.id === idTemporal).dias;
    for (const ej of datos.ejercicios) for (const p of ej.series ?? []) if (p.soloRutina === idTemporal) p.soloRutina = rutina.id;
    datos.rutinas = datos.rutinas.filter((r) => r.id !== idTemporal);
  } else dias = diasDePlantilla(datos, plantilla, rutina.id);
  // Cada día conserva su id (por orden): así la app sabe por qué día vas.
  dias.forEach((dia, k) => { if (rutina.dias[k]) dia.id = rutina.dias[k].id; });
  rutina.dias = dias;
  reutilizarPlanes(datos, rutina);
  rutina.descripcion = `${plantilla.porQue}\n\n${plantilla.comoSeHace}`;
  rutina.versionPlantilla = plantilla.version ?? 1;
  if (tipoDePlantilla(plantilla) === 'flexibilidad' && !rutina.sedeId) rutina.sedeId = sedeDeCasa(datos);
  return true;
}
