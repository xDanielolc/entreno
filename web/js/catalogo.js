// Ejercicios predefinidos, para no tener que escribirlo todo a mano.
//
// Al elegir uno se rellenan nombre, grupo, qué mide y los músculos que
// trabaja; después puedes cambiar lo que quieras. Los músculos son los que
// alimentan el mapa del cuerpo y los avisos de volumen.
//
//   carga: peso | asistida | pesoCorporal | altura | ninguna
//   esfuerzo: repeticiones | tiempo | distancia

const ej = (nombre, grupo, material, principales, secundarios = [], extra = {}) =>
  ({ nombre, grupo, material, musculos: { principales, secundarios }, ...extra });

export const CATALOGO = [
  // --- Empuje -------------------------------------------------------------
  ej('Press de banca', 'empuje', 'barra', ['pecho'], ['triceps', 'hombro']),
  ej('Press de banca con mancuernas', 'empuje', 'mancuernas', ['pecho'], ['triceps', 'hombro']),
  ej('Press inclinado', 'empuje', 'barra', ['pecho'], ['hombro', 'triceps']),
  ej('Aperturas de pecho', 'empuje', 'máquina', ['pecho'], []),
  ej('Fondos de tríceps', 'empuje', 'paralelas', ['triceps'], ['pecho', 'hombro'], { carga: 'pesoCorporal' }),
  ej('Fondos asistidos', 'empuje', 'máquina', ['triceps'], ['pecho', 'hombro'], { carga: 'asistida' }),
  ej('Press militar', 'empuje', 'barra', ['hombro'], ['triceps', 'trapecio']),
  ej('Press de hombro en máquina', 'empuje', 'máquina', ['hombro'], ['triceps']),
  ej('Elevaciones laterales', 'empuje', 'mancuernas', ['hombro'], []),
  ej('Extensión de tríceps en polea', 'empuje', 'polea', ['triceps'], []),
  ej('Extensión de tríceps en máquina', 'empuje', 'máquina', ['triceps'], []),
  ej('Flexiones', 'empuje', 'peso corporal', ['pecho'], ['triceps', 'hombro', 'abdomen'], { carga: 'pesoCorporal' }),
  ej('Flexiones a una mano', 'empuje', 'peso corporal', ['pecho'], ['triceps', 'abdomen', 'oblicuos'], { carga: 'altura' }),

  // --- Tirón --------------------------------------------------------------
  ej('Dominadas', 'tirón', 'barra fija', ['dorsal'], ['biceps', 'antebrazo'], { carga: 'pesoCorporal' }),
  ej('Dominadas asistidas', 'tirón', 'máquina', ['dorsal'], ['biceps', 'antebrazo'], { carga: 'asistida' }),
  ej('Jalón al pecho', 'tirón', 'polea', ['dorsal'], ['biceps']),
  ej('Remo con barra', 'tirón', 'barra', ['dorsal'], ['trapecio', 'biceps', 'lumbar']),
  ej('Remo en polea', 'tirón', 'polea', ['dorsal'], ['trapecio', 'biceps']),
  ej('Remo en máquina', 'tirón', 'máquina', ['dorsal'], ['trapecio', 'biceps']),
  ej('Face pull', 'tirón', 'polea', ['hombro'], ['trapecio']),
  ej('Pájaros con mancuernas', 'tirón', 'mancuernas', ['hombro'], ['trapecio']),
  ej('Curl de bíceps con barra', 'tirón', 'barra', ['biceps'], ['antebrazo']),
  ej('Curl martillo', 'tirón', 'mancuernas', ['biceps'], ['antebrazo']),
  ej('Curl de bíceps en máquina', 'tirón', 'máquina', ['biceps'], []),
  ej('Encogimientos de trapecio', 'tirón', 'mancuernas', ['trapecio'], ['antebrazo']),
  ej('Paseo del granjero', 'tirón', 'mancuernas', ['antebrazo'], ['trapecio', 'abdomen'], { esfuerzo: 'tiempo' }),

  // --- Pierna -------------------------------------------------------------
  ej('Sentadilla', 'pierna', 'barra', ['cuadriceps'], ['gluteo', 'lumbar', 'aductores']),
  ej('Prensa de piernas', 'pierna', 'máquina', ['cuadriceps'], ['gluteo']),
  ej('Peso muerto', 'pierna', 'barra', ['isquios'], ['gluteo', 'lumbar', 'trapecio', 'antebrazo']),
  ej('Peso muerto rumano', 'pierna', 'barra', ['isquios'], ['gluteo', 'lumbar']),
  ej('Zancadas', 'pierna', 'mancuernas', ['cuadriceps'], ['gluteo']),
  ej('Extensión de cuádriceps', 'pierna', 'máquina', ['cuadriceps'], []),
  ej('Curl femoral tumbado', 'pierna', 'máquina', ['isquios'], []),
  ej('Curl femoral sentado', 'pierna', 'máquina', ['isquios'], []),
  ej('Elevación de gemelos', 'pierna', 'máquina', ['gemelo'], []),
  ej('Abductores en máquina', 'pierna', 'máquina', ['abductores'], ['gluteo']),
  ej('Aductores en máquina', 'pierna', 'máquina', ['aductores'], []),
  ej('Máquina de glúteo', 'pierna', 'máquina', ['gluteo'], ['isquios']),
  ej('Hiperextensiones', 'pierna', 'banco', ['lumbar'], ['gluteo', 'isquios'], { carga: 'pesoCorporal' }),

  // --- Core ---------------------------------------------------------------
  ej('Crunch abdominal', 'core', 'máquina', ['abdomen'], []),
  ej('Plancha', 'core', 'peso corporal', ['abdomen'], ['oblicuos'], { carga: 'pesoCorporal', esfuerzo: 'tiempo' }),
  ej('Rueda abdominal', 'core', 'rueda', ['abdomen'], ['oblicuos', 'dorsal'], { carga: 'pesoCorporal' }),
  ej('Leñador en polea', 'core', 'polea', ['oblicuos'], ['abdomen']),
  ej('Press pallof', 'core', 'polea', ['oblicuos'], ['abdomen'], { esfuerzo: 'tiempo' }),
  ej('Elevaciones de piernas', 'core', 'barra fija', ['abdomen'], ['oblicuos'], { carga: 'pesoCorporal' }),

  // --- Cardio -------------------------------------------------------------
  ej('Comba', 'cardio', 'comba', ['gemelo'], [], { carga: 'ninguna', esfuerzo: 'tiempo' }),
  ej('Boxeo', 'cardio', 'saco o sombra', [], [], { carga: 'ninguna', esfuerzo: 'tiempo' }),
  ej('Escaleras', 'cardio', 'libre', ['cuadriceps'], ['gemelo'], { carga: 'ninguna', esfuerzo: 'tiempo', distancia: true }),
  ej('Carrera', 'cardio', 'libre', [], ['cuadriceps', 'gemelo'], { carga: 'ninguna', esfuerzo: 'tiempo', distancia: true }),
  ej('Bicicleta', 'cardio', 'bici', [], ['cuadriceps'], { carga: 'ninguna', esfuerzo: 'tiempo', distancia: true }),
  ej('Elíptica', 'cardio', 'máquina', [], [], { carga: 'ninguna', esfuerzo: 'tiempo', distancia: true }),
  ej('Remo de cardio', 'cardio', 'máquina', [], ['dorsal', 'cuadriceps'], { carga: 'ninguna', esfuerzo: 'tiempo', distancia: true }),
  ej('Caminar', 'cardio', 'libre', [], [], { carga: 'ninguna', esfuerzo: 'tiempo', distancia: true }),

  // --- Movilidad ----------------------------------------------------------
  ej('Estiramiento', 'movilidad', 'libre', [], [], { carga: 'ninguna', esfuerzo: 'tiempo' }),
  ej('Nerve floss', 'movilidad', 'libre', [], [], { carga: 'ninguna', esfuerzo: 'tiempo' }),
  ej('Rotación 90/90', 'movilidad', 'suelo', [], ['gluteo'], { carga: 'ninguna' }),
  ej('Gato-camello', 'movilidad', 'suelo', [], ['lumbar'], { carga: 'ninguna', esfuerzo: 'tiempo' }),
  ej('Liberación con rodillo', 'movilidad', 'rodillo', [], [], { carga: 'ninguna', esfuerzo: 'tiempo' }),
];

export function buscarEnCatalogo(texto) {
  const f = (texto || '').trim().toLowerCase();
  if (!f) return CATALOGO;
  return CATALOGO.filter((e) => `${e.nombre} ${e.grupo} ${e.material}`.toLowerCase().includes(f));
}
