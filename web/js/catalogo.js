// Ejercicios predefinidos, para no tener que escribirlo todo a mano.
//
// Solo son un punto de partida: al elegir uno se rellena el nombre, el grupo
// y qué mide, y después puedes cambiar lo que quieras. Las imágenes vendrán
// más adelante, con una biblioteca de uso libre.
//
//   carga: peso | asistida | pesoCorporal | altura | ninguna
//   esfuerzo: repeticiones | tiempo | distancia

export const CATALOGO = [
  // --- Empuje -------------------------------------------------------------
  { nombre: 'Press de banca', grupo: 'empuje', material: 'barra', musculos: 'pecho, tríceps, hombro anterior' },
  { nombre: 'Press de banca con mancuernas', grupo: 'empuje', material: 'mancuernas', musculos: 'pecho, tríceps' },
  { nombre: 'Press inclinado', grupo: 'empuje', material: 'barra', musculos: 'pecho superior, hombro' },
  { nombre: 'Aperturas de pecho', grupo: 'empuje', material: 'máquina', musculos: 'pecho' },
  { nombre: 'Fondos de tríceps', grupo: 'empuje', material: 'paralelas', carga: 'pesoCorporal', musculos: 'tríceps, pecho inferior' },
  { nombre: 'Fondos asistidos', grupo: 'empuje', material: 'máquina', carga: 'asistida', musculos: 'tríceps, pecho inferior' },
  { nombre: 'Press militar', grupo: 'empuje', material: 'barra', musculos: 'hombro, tríceps' },
  { nombre: 'Press de hombro en máquina', grupo: 'empuje', material: 'máquina', musculos: 'hombro' },
  { nombre: 'Elevaciones laterales', grupo: 'empuje', material: 'mancuernas', musculos: 'deltoides medio' },
  { nombre: 'Extensión de tríceps en polea', grupo: 'empuje', material: 'polea', musculos: 'tríceps' },
  { nombre: 'Flexiones', grupo: 'empuje', material: 'peso corporal', carga: 'pesoCorporal', musculos: 'pecho, tríceps' },
  { nombre: 'Flexiones a una mano', grupo: 'empuje', material: 'peso corporal', carga: 'altura', musculos: 'pecho, tríceps, core' },

  // --- Tirón --------------------------------------------------------------
  { nombre: 'Dominadas', grupo: 'tirón', material: 'barra fija', carga: 'pesoCorporal', musculos: 'dorsal, bíceps' },
  { nombre: 'Dominadas asistidas', grupo: 'tirón', material: 'máquina', carga: 'asistida', musculos: 'dorsal, bíceps' },
  { nombre: 'Jalón al pecho', grupo: 'tirón', material: 'polea', musculos: 'dorsal, bíceps' },
  { nombre: 'Remo con barra', grupo: 'tirón', material: 'barra', musculos: 'dorsal, espalda media' },
  { nombre: 'Remo en polea', grupo: 'tirón', material: 'polea', musculos: 'espalda media, bíceps' },
  { nombre: 'Remo en máquina', grupo: 'tirón', material: 'máquina', musculos: 'espalda media' },
  { nombre: 'Face pull', grupo: 'tirón', material: 'polea', musculos: 'deltoides posterior, trapecio' },
  { nombre: 'Pájaros con mancuernas', grupo: 'tirón', material: 'mancuernas', musculos: 'deltoides posterior' },
  { nombre: 'Curl de bíceps con barra', grupo: 'tirón', material: 'barra', musculos: 'bíceps' },
  { nombre: 'Curl martillo', grupo: 'tirón', material: 'mancuernas', musculos: 'bíceps, braquial' },
  { nombre: 'Encogimientos de trapecio', grupo: 'tirón', material: 'mancuernas', musculos: 'trapecio' },

  // --- Pierna -------------------------------------------------------------
  { nombre: 'Sentadilla', grupo: 'pierna', material: 'barra', musculos: 'cuádriceps, glúteo' },
  { nombre: 'Prensa de piernas', grupo: 'pierna', material: 'máquina', musculos: 'cuádriceps, glúteo' },
  { nombre: 'Peso muerto', grupo: 'pierna', material: 'barra', musculos: 'isquios, glúteo, espalda baja' },
  { nombre: 'Peso muerto rumano', grupo: 'pierna', material: 'barra', musculos: 'isquios, glúteo' },
  { nombre: 'Zancadas', grupo: 'pierna', material: 'mancuernas', musculos: 'cuádriceps, glúteo' },
  { nombre: 'Extensión de cuádriceps', grupo: 'pierna', material: 'máquina', musculos: 'cuádriceps' },
  { nombre: 'Curl femoral tumbado', grupo: 'pierna', material: 'máquina', musculos: 'isquios' },
  { nombre: 'Elevación de gemelos', grupo: 'pierna', material: 'máquina', musculos: 'gemelo' },
  { nombre: 'Abductores en máquina', grupo: 'pierna', material: 'máquina', musculos: 'glúteo medio' },
  { nombre: 'Aductores en máquina', grupo: 'pierna', material: 'máquina', musculos: 'aductores' },
  { nombre: 'Hiperextensiones', grupo: 'pierna', material: 'banco', carga: 'pesoCorporal', musculos: 'espalda baja, glúteo' },

  // --- Core ---------------------------------------------------------------
  { nombre: 'Crunch abdominal', grupo: 'core', material: 'máquina', musculos: 'abdomen' },
  { nombre: 'Plancha', grupo: 'core', material: 'peso corporal', carga: 'ninguna', esfuerzo: 'tiempo', musculos: 'core' },
  { nombre: 'Rueda abdominal', grupo: 'core', material: 'rueda', carga: 'pesoCorporal', musculos: 'abdomen' },
  { nombre: 'Leñador en polea', grupo: 'core', material: 'polea', musculos: 'oblicuos' },
  { nombre: 'Press pallof', grupo: 'core', material: 'polea', musculos: 'core antirrotación' },
  { nombre: 'Paseo del granjero', grupo: 'core', material: 'mancuernas', esfuerzo: 'tiempo', musculos: 'agarre, core' },

  // --- Cardio y movilidad -------------------------------------------------
  { nombre: 'Cardio', grupo: 'cardio', material: 'libre', carga: 'ninguna', esfuerzo: 'tiempo', distancia: true, musculos: 'corazón' },
  { nombre: 'Comba', grupo: 'cardio', material: 'comba', carga: 'ninguna', esfuerzo: 'tiempo', musculos: 'gemelo, corazón' },
  { nombre: 'Carrera', grupo: 'cardio', material: 'libre', carga: 'ninguna', esfuerzo: 'tiempo', distancia: true, musculos: 'pierna, corazón' },
  { nombre: 'Estiramiento', grupo: 'movilidad', material: 'libre', carga: 'ninguna', esfuerzo: 'tiempo', musculos: 'según el estiramiento' },
];

export function buscarEnCatalogo(texto) {
  const f = (texto || '').trim().toLowerCase();
  if (!f) return CATALOGO;
  return CATALOGO.filter((e) => `${e.nombre} ${e.grupo} ${e.material} ${e.musculos}`.toLowerCase().includes(f));
}
