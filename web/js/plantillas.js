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

// Formas de serie que usan las plantillas.
const bilbo = { tipo: 'bilbo' };
const dropSet = (min, max) => ({ tipo: 'intensidad', tecnicas: ['drop-set'], objetivo: [min, max] });
const isometrico = (min, max) => ({ tipo: 'intensidad', tecnicas: ['isometrico-final'], objetivo: [min, max] });
const excentricas = (min, max) => ({ tipo: 'intensidad', tecnicas: ['excentricas-lentas'], objetivo: [min, max] });
const alFallo = (min = 6, max = 10) => ({ tipo: 'libre', progresion: 'carga', objetivo: [min, max], alFallo: true });
const sinFallo = (min = 15, max = 20) => ({ tipo: 'libre', progresion: 'carga', objetivo: [min, max] });
const libre = { tipo: 'libre' };
const restPause = (min, max) => ({ tipo: 'intensidad', tecnicas: ['rest-pause'], objetivo: [min, max] });
const unilateral = (forma) => ({ ...forma, tecnicas: [...forma.tecnicas, 'unilateral'] });
// Varias series iguales con doble progresión en un rango de repeticiones.
const series = (n, min, max) => Array.from({ length: n }, () => ({ tipo: 'libre', progresion: 'carga', objetivo: [min, max] }));

const e = (nombre, series, extra = {}) => ({ nombre, series, ...extra });

export const PLANTILLAS = [
  {
    id: 'plpl-bilbo-heavy-duty',
    nombre: 'PLPL Bilbo + Heavy Duty',
    autor: 'Dan (la rutina con la que se hizo esta app)',
    resumen: 'Cuatro días: empuje, pierna, tirón, pierna. En cada ejercicio, una serie Bilbo y una serie de intensidad.',
    porQue: 'Junta dos ideas. El método Bilbo sube la carga un poco cada día dentro de un ciclo y te pide superar el 1RM del día '
      + 'anterior, con series largas (20-30 repeticiones) que construyen resistencia y fuerza sin cargar demasiado las articulaciones. '
      + 'Detrás va una sola serie muy intensa al estilo Heavy Duty (drop set, isométrico final o excéntricas lentas), que da el '
      + 'estímulo de alta intensidad con poco volumen. Alternar empuje, pierna y tirón deja descansar cada grupo varios días.',
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
      + 'entrenar a la máxima intensidad. Una sola serie por ejercicio y sin fallo: debes acabar algo cansado, no agotado.',
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
      + 'Una serie bien hecha basta, y el resto del tiempo es para recuperarse.',
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
      + 'arrastra al hombro y al tríceps.',
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
      + 'el grande que quieres trabajar. Cansar antes el grande con un ejercicio aislado hace que el compuesto lo lleve de verdad al fallo.',
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
      + 'cuerpo en tres y, cuando se estanca, alarga el ciclo (de 7 a 10 y luego a 14 días) en vez de añadir series.',
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
    nombre: 'PPL Bilbo + Heavy Duty (3 días)',
    autor: 'Dan (versión anterior, noviembre de 2025)',
    resumen: 'Tres días: empuje, tirón y pierna. Cada ejercicio con una serie Bilbo y una de intensidad; unos 30-40 minutos por día.',
    porQue: 'La misma idea que la PLPL, en tres días en lugar de cuatro: la serie Bilbo (20-30 repeticiones sin llegar al fallo) '
      + 'construye la base, y la serie Heavy Duty (6-12 repeticiones con rest-pause, drop set, isométrico o excéntricas) da el estímulo '
      + 'intenso. En peso muerto, press, sentadilla, dominadas y fondos se para en el fallo técnico, antes de perder la postura; '
      + 'en máquinas se puede ir al fallo total.',
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
        e('Remo en máquina', [bilbo, unilateral(dropSet(6, 8))]),
        e('Curl de bíceps en máquina', [bilbo, isometrico(8, 12)]),
        e('Pájaros con mancuernas', [bilbo, isometrico(10, 12)]),
        e('Carrera', [libre], { opcional: true }),
      ] },
      { nombre: 'Día 3: pierna', ejercicios: [
        e('Saltos al cajón', [libre], { opcional: true, nota: 'Calentamiento' }),
        e('Sentadilla', [bilbo, alFallo(6, 8)], { nota: 'Fallo técnico' }),
        e('Extensión de cuádriceps', [alFallo(12, 20)], { nota: 'A una pierna y luego a dos, peso medio' }),
        e('Curl femoral tumbado', [bilbo, unilateral(dropSet(8, 10))]),
        e('Abductores en máquina', [bilbo, excentricas(8, 10)]),
        e('Aductores en máquina', [bilbo, dropSet(8, 10)]),
        e('Elevación de gemelos', [bilbo, unilateral(isometrico(10, 12))]),
        e('Carrera', [libre], { opcional: true }),
      ] },
    ],
  },
  {
    id: 'pesos-libres-cualquier-gimnasio',
    nombre: 'Sin máquinas: igual en cualquier gimnasio',
    autor: 'Propuesta de la app',
    resumen: 'Cuerpo entero en dos días alternos (A y B), solo con barra, mancuernas y tu peso: los kilos valen en cualquier gimnasio.',
    porQue: 'Una barra olímpica y unas mancuernas pesan lo mismo en todas partes; una máquina, no. Si cambias de gimnasio o viajas, '
      + 'esta rutina no pierde el hilo de tu progresión. Los básicos con barra además trabajan mucho músculo a la vez.',
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
      + 'los mismos movimientos ayuda a aprenderlos. Las máquinas y las mancuernas son más fáciles de controlar que la barra libre.',
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
    nombre: 'Calistenia: cuerpo entero',
    autor: 'Propuesta de la app',
    resumen: 'Solo con tu peso, una barra y unas paralelas (o un parque). Tres días por semana.',
    porQue: 'Para entrenar en casa o en la calle sin material. Se progresa haciendo más repeticiones y pasando a variantes más '
      + 'difíciles: de flexiones con rodillas a flexiones, de remo invertido a dominadas, de sentadilla a sentadilla a una pierna.',
    comoSeHace: 'Tres días no seguidos, la misma sesión. Tres series por ejercicio a 1-2 del fallo. Si una variante te sale con más de '
      + '15 repeticiones, pasa a la siguiente; si no llegas a 5, usa la anterior (con rodillas, con goma, con apoyo).',
    dias: [
      { nombre: 'Cuerpo entero', ejercicios: [
        e('Flexiones', series(3, 5, 15), { nota: 'Con rodillas si no llegas a 5' }),
        e('Dominadas', series(3, 3, 10), { nota: 'O remo invertido si aún no salen' }),
        e('Sentadilla a una pierna', series(3, 5, 12), { nota: 'Empieza con sentadilla normal o con apoyo' }),
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
  return plan;
}

// Qué ejercicios nuevos crearía la plantilla (los que no tienes ya).
export function ejerciciosNuevos(datos, plantilla) {
  const tuyos = new Set(datos.ejercicios.filter((x) => !x.archivado).map((x) => normalizar(x.nombre)));
  const nombres = [...new Set(plantilla.dias.flatMap((d) => d.ejercicios.map((x) => x.nombre)))];
  return nombres.filter((n) => !tuyos.has(normalizar(n)));
}

// Añade la rutina y los ejercicios que falten. Cambia `datos` (dentro de
// estado.cambiar) y devuelve el id de la rutina nueva.
export function anadirPlantilla(datos, plantilla) {
  const porNombre = new Map(datos.ejercicios.filter((x) => !x.archivado).map((x) => [normalizar(x.nombre), x]));
  const idDe = (item) => {
    const clave = normalizar(item.nombre);
    if (porNombre.has(clave)) return porNombre.get(clave).id;
    const base = CATALOGO.find((c) => normalizar(c.nombre) === clave) ?? { nombre: item.nombre, grupo: '', material: '' };
    const nuevo = ejercicioDesdeCatalogo(base);
    nuevo.series = item.series.map((forma) => planDesde(nuevo, forma));
    datos.ejercicios.push(nuevo);
    porNombre.set(clave, nuevo);
    return nuevo.id;
  };
  const rutina = {
    id: nuevoId('rut'), nombre: plantilla.nombre, activa: !datos.rutinas.some((r) => r.activa),
    sedeId: null, plantilla: plantilla.id,
    descripcion: `${plantilla.porQue}\n\n${plantilla.comoSeHace}`,
    dias: plantilla.dias.map((dia) => ({
      id: nuevoId('dia'), nombre: dia.nombre,
      ejercicios: dia.ejercicios.map((item) => ({ ejercicioId: idDe(item), opcional: Boolean(item.opcional), series: null, nota: item.nota ?? null })),
    })),
  };
  datos.rutinas.push(rutina);
  return rutina.id;
}
