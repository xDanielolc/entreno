// Ejercicios predefinidos, para no tener que escribirlo todo a mano.
//
// Al elegir uno se rellenan nombre, grupo, qué mide y los músculos que
// trabaja; después puedes cambiar lo que quieras. Los músculos son los que
// alimentan el mapa del cuerpo y los avisos de volumen.
//
//   carga: peso | asistida | pesoCorporal | altura | ninguna
//   esfuerzo: repeticiones | tiempo | distancia
//
// En estiramientos, movilidad y yoga los músculos son los que se estiran o
// se trabajan, y sirven para buscar y filtrar; no cuentan para la fatiga.
//
// Las posturas de yoga siguen el índice de «Anatomía del yoga» (Kaminoff),
// con su nombre en español y en sánscrito.

const ej = (nombre, grupo, material, principales, secundarios = [], extra = {}) =>
  ({ nombre, grupo, material, musculos: { principales, secundarios }, ...extra });

const sinCarga = { carga: 'ninguna', esfuerzo: 'tiempo' };
const corporal = { carga: 'pesoCorporal' };
// Fracción del peso corporal que se levanta (Ebben 2011: flexiones ≈ 64 %).
const flexion = (f) => ({ carga: 'pesoCorporal', fraccion: f });

const estiramiento = (nombre, principales, secundarios = [], material = 'libre') =>
  ej(nombre, 'estiramiento', material, principales, secundarios, sinCarga);

const movilidad = (nombre, principales, secundarios = [], material = 'libre', extra = {}) =>
  ej(nombre, 'movilidad', material, principales, secundarios, { ...sinCarga, ...extra });

// Postura de yoga: nombre en español y en sánscrito.
const yoga = (espanol, sanscrito, familia, principales, secundarios = []) => ({
  nombre: `${espanol} (${sanscrito})`, sanscrito, familia, grupo: 'yoga', material: 'esterilla',
  musculos: { principales, secundarios }, ...sinCarga,
});

export const CATALOGO = [
  // --- Empuje -------------------------------------------------------------
  ej('Press de banca', 'empuje', 'barra', ['pecho'], ['triceps', 'hombro']),
  ej('Press de banca con mancuernas', 'empuje', 'mancuernas', ['pecho'], ['triceps', 'hombro']),
  ej('Press inclinado', 'empuje', 'barra', ['pecho'], ['hombro', 'triceps']),
  ej('Press inclinado con mancuernas', 'empuje', 'mancuernas', ['pecho'], ['hombro', 'triceps']),
  ej('Press declinado', 'empuje', 'barra', ['pecho'], ['triceps']),
  ej('Press de pecho en máquina', 'empuje', 'máquina', ['pecho'], ['triceps', 'hombro']),
  ej('Aperturas de pecho', 'empuje', 'máquina', ['pecho'], []),
  ej('Aperturas con mancuernas', 'empuje', 'mancuernas', ['pecho'], ['hombro']),
  ej('Cruces en polea', 'empuje', 'polea', ['pecho'], ['hombro']),
  ej('Fondos de tríceps', 'empuje', 'paralelas', ['triceps'], ['pecho', 'hombro'], corporal),
  ej('Fondos asistidos', 'empuje', 'máquina', ['triceps'], ['pecho', 'hombro'], { carga: 'asistida' }),
  ej('Fondos en banco', 'empuje', 'banco', ['triceps'], ['hombro'], corporal),
  ej('Press militar', 'empuje', 'barra', ['hombro'], ['triceps', 'trapecio']),
  ej('Press de hombro con mancuernas', 'empuje', 'mancuernas', ['hombro'], ['triceps']),
  ej('Press Arnold', 'empuje', 'mancuernas', ['hombro'], ['triceps']),
  ej('Press de hombro en máquina', 'empuje', 'máquina', ['hombro'], ['triceps']),
  ej('Elevaciones laterales', 'empuje', 'mancuernas', ['hombro'], []),
  ej('Elevaciones laterales en polea', 'empuje', 'polea', ['hombro'], []),
  ej('Elevaciones frontales', 'empuje', 'mancuernas', ['hombro'], ['pecho']),
  ej('Press cerrado', 'empuje', 'barra', ['triceps'], ['pecho', 'hombro']),
  ej('Press francés', 'empuje', 'barra', ['triceps'], []),
  ej('Extensión de tríceps en polea', 'empuje', 'polea', ['triceps'], []),
  ej('Extensión de tríceps sobre la cabeza', 'empuje', 'polea', ['triceps'], []),
  ej('Extensión de tríceps en máquina', 'empuje', 'máquina', ['triceps'], []),
  ej('Patada de tríceps', 'empuje', 'mancuernas', ['triceps'], []),
  ej('Flexiones', 'empuje', 'peso corporal', ['pecho'], ['triceps', 'hombro', 'abdomen'], flexion(0.64)),
  ej('Flexiones diamante', 'empuje', 'peso corporal', ['triceps'], ['pecho', 'hombro'], flexion(0.64)),
  ej('Flexiones en pica', 'empuje', 'peso corporal', ['hombro'], ['triceps', 'trapecio'], flexion(0.74)),
  ej('Flexiones en pino', 'empuje', 'pared', ['hombro'], ['triceps', 'trapecio'], flexion(0.74)),
  ej('Flexiones a una mano', 'empuje', 'peso corporal', ['pecho'], ['triceps', 'abdomen', 'oblicuos'], { carga: 'altura' }),

  // --- Tirón --------------------------------------------------------------
  ej('Dominadas', 'tirón', 'barra fija', ['dorsal'], ['biceps', 'antebrazo'], corporal),
  ej('Dominadas supinas', 'tirón', 'barra fija', ['dorsal', 'biceps'], ['antebrazo'], corporal),
  ej('Dominadas asistidas', 'tirón', 'máquina', ['dorsal'], ['biceps', 'antebrazo'], { carga: 'asistida' }),
  ej('Jalón al pecho', 'tirón', 'polea', ['dorsal'], ['biceps']),
  ej('Jalón con agarre estrecho', 'tirón', 'polea', ['dorsal'], ['biceps']),
  ej('Pullover en polea', 'tirón', 'polea', ['dorsal'], ['triceps']),
  ej('Remo con barra', 'tirón', 'barra', ['dorsal'], ['trapecio', 'biceps', 'lumbar', 'hombroPosterior']),
  ej('Remo con mancuerna', 'tirón', 'mancuernas', ['dorsal'], ['biceps', 'hombroPosterior']),
  ej('Remo en T', 'tirón', 'barra', ['dorsal'], ['trapecio', 'biceps', 'lumbar']),
  ej('Remo en polea', 'tirón', 'polea', ['dorsal'], ['trapecio', 'biceps', 'hombroPosterior']),
  ej('Remo en máquina', 'tirón', 'máquina', ['dorsal'], ['trapecio', 'biceps', 'hombroPosterior']),
  ej('Remo invertido', 'tirón', 'barra baja', ['dorsal'], ['biceps', 'hombroPosterior'], corporal),
  ej('Face pull', 'tirón', 'polea', ['hombroPosterior'], ['trapecio']),
  ej('Pájaros con mancuernas', 'tirón', 'mancuernas', ['hombroPosterior'], ['trapecio']),
  ej('Pájaros en máquina', 'tirón', 'máquina', ['hombroPosterior'], ['trapecio']),
  ej('Remo al mentón', 'tirón', 'barra', ['trapecio'], ['hombro', 'biceps']),
  ej('Encogimientos de trapecio', 'tirón', 'mancuernas', ['trapecio'], ['antebrazo']),
  ej('Curl de bíceps con barra', 'tirón', 'barra', ['biceps'], ['antebrazo']),
  ej('Curl de bíceps con mancuernas', 'tirón', 'mancuernas', ['biceps'], ['antebrazo']),
  ej('Curl martillo', 'tirón', 'mancuernas', ['biceps', 'antebrazo'], []),
  ej('Curl concentrado', 'tirón', 'mancuernas', ['biceps'], []),
  ej('Curl predicador', 'tirón', 'barra', ['biceps'], ['antebrazo']),
  ej('Curl inclinado', 'tirón', 'mancuernas', ['biceps'], []),
  ej('Curl en polea', 'tirón', 'polea', ['biceps'], ['antebrazo']),
  ej('Curl de bíceps en máquina', 'tirón', 'máquina', ['biceps'], []),
  ej('Curl invertido', 'tirón', 'barra', ['antebrazo'], ['biceps']),
  ej('Curl de muñeca', 'tirón', 'mancuernas', ['antebrazo'], []),
  ej('Extensión de muñeca', 'tirón', 'mancuernas', ['antebrazo'], []),
  ej('Colgarse de la barra', 'tirón', 'barra fija', ['antebrazo'], ['dorsal', 'hombro'], { carga: 'pesoCorporal', esfuerzo: 'tiempo' }),
  ej('Paseo del granjero', 'tirón', 'mancuernas', ['antebrazo'], ['trapecio', 'abdomen'], { esfuerzo: 'tiempo' }),

  // --- Pierna -------------------------------------------------------------
  ej('Sentadilla', 'pierna', 'barra', ['cuadriceps'], ['gluteo', 'lumbar', 'aductores']),
  ej('Sentadilla frontal', 'pierna', 'barra', ['cuadriceps'], ['gluteo', 'abdomen', 'lumbar']),
  ej('Sentadilla goblet', 'pierna', 'mancuerna', ['cuadriceps'], ['gluteo', 'aductores']),
  ej('Sentadilla búlgara', 'pierna', 'mancuernas', ['cuadriceps', 'gluteo'], ['aductores']),
  ej('Sentadilla hack', 'pierna', 'máquina', ['cuadriceps'], ['gluteo']),
  ej('Sentadilla en multipower', 'pierna', 'multipower', ['cuadriceps'], ['gluteo']),
  ej('Sentadilla a una pierna', 'pierna', 'peso corporal', ['cuadriceps', 'gluteo'], ['aductores'], corporal),
  ej('Sentadilla sissy', 'pierna', 'peso corporal', ['cuadriceps'], [], corporal),
  ej('Prensa de piernas', 'pierna', 'máquina', ['cuadriceps'], ['gluteo']),
  ej('Peso muerto', 'pierna', 'barra', ['isquios', 'gluteo'], ['lumbar', 'trapecio', 'antebrazo']),
  ej('Peso muerto sumo', 'pierna', 'barra', ['gluteo', 'aductores'], ['isquios', 'lumbar', 'cuadriceps']),
  ej('Peso muerto rumano', 'pierna', 'barra', ['isquios'], ['gluteo', 'lumbar']),
  ej('Buenos días', 'pierna', 'barra', ['isquios', 'lumbar'], ['gluteo']),
  ej('Zancadas', 'pierna', 'mancuernas', ['cuadriceps'], ['gluteo']),
  ej('Zancadas hacia atrás', 'pierna', 'mancuernas', ['gluteo', 'cuadriceps'], ['isquios']),
  ej('Subida al cajón', 'pierna', 'cajón', ['cuadriceps', 'gluteo'], []),
  ej('Hip thrust', 'pierna', 'barra', ['gluteo'], ['isquios']),
  ej('Puente de glúteo', 'pierna', 'peso corporal', ['gluteo'], ['isquios'], corporal),
  ej('Patada de glúteo en polea', 'pierna', 'polea', ['gluteo'], ['isquios']),
  ej('Máquina de glúteo', 'pierna', 'máquina', ['gluteo'], ['isquios']),
  ej('Extensión de cuádriceps', 'pierna', 'máquina', ['cuadriceps'], []),
  ej('Curl femoral tumbado', 'pierna', 'máquina', ['isquios'], []),
  ej('Curl femoral sentado', 'pierna', 'máquina', ['isquios'], []),
  ej('Curl nórdico', 'pierna', 'peso corporal', ['isquios'], [], corporal),
  ej('Elevación de gemelos', 'pierna', 'máquina', ['gemelo'], []),
  ej('Elevación de gemelos sentado', 'pierna', 'máquina', ['gemelo'], []),
  ej('Elevación de tibiales', 'pierna', 'pared', ['tibial'], [], corporal),
  ej('Tibial con disco', 'pierna', 'disco', ['tibial'], []),
  ej('Abductores en máquina', 'pierna', 'máquina', ['abductores'], ['gluteo']),
  ej('Abducción en polea', 'pierna', 'polea', ['abductores'], ['gluteo']),
  ej('Aductores en máquina', 'pierna', 'máquina', ['aductores'], []),
  ej('Plancha Copenhague', 'pierna', 'banco', ['aductores'], ['oblicuos'], { carga: 'pesoCorporal', esfuerzo: 'tiempo' }),
  ej('Hiperextensiones', 'pierna', 'banco', ['lumbar'], ['gluteo', 'isquios'], corporal),

  // --- Core ---------------------------------------------------------------
  ej('Crunch abdominal', 'core', 'máquina', ['abdomen'], []),
  ej('Crunch en polea', 'core', 'polea', ['abdomen'], ['oblicuos']),
  ej('Crunch inverso', 'core', 'banco', ['abdomen'], [], corporal),
  ej('Plancha', 'core', 'peso corporal', ['abdomen'], ['oblicuos'], { carga: 'pesoCorporal', esfuerzo: 'tiempo' }),
  ej('Plancha lateral', 'core', 'peso corporal', ['oblicuos'], ['abdomen', 'abductores'], { carga: 'pesoCorporal', esfuerzo: 'tiempo' }),
  ej('Posición hueca', 'core', 'suelo', ['abdomen'], [], { carga: 'pesoCorporal', esfuerzo: 'tiempo' }),
  ej('Bicho muerto', 'core', 'suelo', ['abdomen'], ['lumbar'], corporal),
  ej('Pájaro-perro', 'core', 'suelo', ['lumbar'], ['gluteo', 'abdomen'], corporal),
  ej('Superman', 'core', 'suelo', ['lumbar'], ['gluteo'], corporal),
  ej('Rueda abdominal', 'core', 'rueda', ['abdomen'], ['oblicuos', 'dorsal'], corporal),
  ej('Leñador en polea', 'core', 'polea', ['oblicuos'], ['abdomen']),
  ej('Giros rusos', 'core', 'disco', ['oblicuos'], ['abdomen']),
  ej('Press pallof', 'core', 'polea', ['oblicuos'], ['abdomen'], { esfuerzo: 'tiempo' }),
  ej('Elevaciones de piernas', 'core', 'barra fija', ['abdomen'], ['oblicuos'], corporal),
  ej('Elevaciones de rodillas en paralelas', 'core', 'paralelas', ['abdomen'], [], corporal),
  ej('Bandera del dragón', 'core', 'banco', ['abdomen'], ['oblicuos', 'lumbar'], corporal),

  // --- Cuello -------------------------------------------------------------
  ej('Flexión de cuello con disco', 'core', 'disco', ['cuello'], []),
  ej('Extensión de cuello con arnés', 'core', 'arnés', ['cuello'], ['trapecio']),
  ej('Flexión lateral de cuello', 'core', 'disco o goma', ['cuello'], []),
  ej('Isométricos de cuello', 'core', 'mano o goma', ['cuello'], [], sinCarga),

  // --- Cardio -------------------------------------------------------------
  ej('Cardio', 'cardio', 'libre', [], [], { ...sinCarga, distancia: true }),
  ej('Comba', 'cardio', 'comba', ['gemelo'], [], sinCarga),
  ej('Boxeo', 'cardio', 'saco o sombra', [], ['hombro'], sinCarga),
  ej('Escaleras', 'cardio', 'libre', ['cuadriceps'], ['gemelo'], { ...sinCarga, distancia: true }),
  ej('Carrera', 'cardio', 'libre', [], ['cuadriceps', 'gemelo'], { ...sinCarga, distancia: true }),
  ej('Bicicleta', 'cardio', 'bici', [], ['cuadriceps'], { ...sinCarga, distancia: true }),
  ej('Bicicleta de aire', 'cardio', 'máquina', [], ['cuadriceps', 'hombro'], { ...sinCarga, distancia: true }),
  ej('Elíptica', 'cardio', 'máquina', [], [], { ...sinCarga, distancia: true }),
  ej('Remo de cardio', 'cardio', 'máquina', [], ['dorsal', 'cuadriceps'], { ...sinCarga, distancia: true }),
  ej('Natación', 'cardio', 'piscina', [], ['dorsal', 'hombro'], { ...sinCarga, distancia: true }),
  ej('Caminar', 'cardio', 'libre', [], [], { ...sinCarga, distancia: true }),
  ej('Senderismo', 'cardio', 'montaña', [], ['cuadriceps', 'gemelo'], { ...sinCarga, distancia: true }),
  ej('Burpees', 'cardio', 'peso corporal', [], ['pecho', 'cuadriceps'], { carga: 'ninguna' }),
  ej('Saltos al cajón', 'cardio', 'cajón', ['cuadriceps'], ['gluteo', 'gemelo'], { carga: 'altura' }),

  // --- Estiramientos ------------------------------------------------------
  estiramiento('Estiramiento', []),
  estiramiento('Estiramiento de isquios', ['isquios'], ['gemelo']),
  estiramiento('Estiramiento de cuádriceps', ['cuadriceps']),
  estiramiento('Estiramiento de psoas en zancada', ['cuadriceps'], ['abdomen']),
  estiramiento('Estiramiento de gemelo en pared', ['gemelo'], [], 'pared'),
  estiramiento('Estiramiento de glúteo en figura de 4', ['gluteo'], ['abductores']),
  estiramiento('Estiramiento de aductores en mariposa', ['aductores']),
  estiramiento('Estiramiento de pectoral en el marco de la puerta', ['pecho'], ['hombro'], 'marco de puerta'),
  estiramiento('Estiramiento de dorsal', ['dorsal'], ['triceps']),
  estiramiento('Estiramiento de tríceps', ['triceps'], ['dorsal']),
  estiramiento('Estiramiento de hombro cruzado', ['hombroPosterior'], ['trapecio']),
  estiramiento('Estiramiento lateral de cuello', ['cuello'], ['trapecio']),
  estiramiento('Estiramiento de antebrazo', ['antebrazo']),
  estiramiento('Estiramiento de lumbares con rodillas al pecho', ['lumbar'], ['gluteo']),

  // --- Movilidad ----------------------------------------------------------
  movilidad('CARs de hombro', ['hombro'], ['hombroPosterior']),
  movilidad('CARs de cadera', ['gluteo'], ['aductores', 'abductores']),
  movilidad('Dislocaciones con pica', ['hombro'], ['pecho', 'hombroPosterior'], 'pica o goma'),
  movilidad('Tobillo con rodilla a la pared', ['gemelo'], ['tibial'], 'pared', { carga: 'altura', esfuerzo: 'repeticiones' }),
  movilidad('Rotación torácica en libro abierto', ['oblicuos'], ['pecho']),
  movilidad('Sentadilla profunda mantenida', ['aductores'], ['gemelo', 'lumbar']),
  movilidad('Sentadilla cosaca', ['aductores'], ['cuadriceps', 'gluteo'], 'libre', { esfuerzo: 'repeticiones' }),
  movilidad('Movilidad de muñeca', ['antebrazo']),
  movilidad('Rotación 90/90', ['gluteo'], ['abductores'], 'suelo', { esfuerzo: 'repeticiones' }),
  movilidad('Gato-camello', ['lumbar'], ['abdomen'], 'suelo'),
  movilidad('Deslizamiento neural (nerve floss)', [], [], 'libre', { esfuerzo: 'repeticiones' }),
  movilidad('Liberación con rodillo', [], [], 'rodillo'),

  // --- Yoga: de pie -------------------------------------------------------
  yoga('Guerrero I', 'Virabhadrasana I', 'de pie', ['cuadriceps', 'gluteo'], ['hombro', 'abdomen']),
  yoga('Guerrero II', 'Virabhadrasana II', 'de pie', ['cuadriceps', 'aductores'], ['hombro']),
  yoga('Guerrero III', 'Virabhadrasana III', 'de pie', ['isquios', 'gluteo'], ['lumbar']),
  yoga('Flexión de tronco de pie', 'Uttanasana', 'de pie', ['isquios'], ['gemelo', 'lumbar']),
  yoga('Flexión de tronco en postura amplia', 'Prasarita Padottanasana', 'de pie', ['isquios', 'aductores'], []),
  yoga('Estiramiento lateral intenso', 'Parsvottanasana', 'de pie', ['isquios'], ['gluteo']),
  yoga('Montaña', 'Tadasana', 'de pie', [], ['abdomen']),
  yoga('Silla', 'Utkatasana', 'de pie', ['cuadriceps', 'gluteo'], ['hombro', 'lumbar']),
  yoga('Águila', 'Garudasana', 'de pie', ['abductores', 'gluteo'], ['hombroPosterior']),
  yoga('Árbol', 'Vrksasana', 'de pie', ['gluteo'], ['aductores', 'gemelo']),
  yoga('Rey de los bailarines', 'Natarajasana', 'de pie', ['cuadriceps'], ['pecho', 'hombro']),
  yoga('Triángulo', 'Trikonasana', 'de pie', ['isquios', 'aductores'], ['oblicuos']),
  yoga('Mano al dedo gordo del pie', 'Utthita Hasta Padangusthasana', 'de pie', ['isquios'], ['gluteo']),
  yoga('Ángulo lateral extendido', 'Utthita Parsvakonasana', 'de pie', ['cuadriceps', 'aductores'], ['oblicuos']),
  yoga('Ángulo lateral girado', 'Parivritta Baddha Parsvakonasana', 'de pie', ['oblicuos'], ['cuadriceps']),
  yoga('Triángulo girado', 'Parivritta Trikonasana', 'de pie', ['isquios', 'oblicuos'], []),
  yoga('Sentada en cuclillas', 'Upavesasana', 'de pie', ['aductores'], ['gemelo', 'lumbar']),

  // --- Yoga: sentadas -----------------------------------------------------
  yoga('Medio señor de los peces', 'Ardha Matsyendrasana', 'sentada', ['oblicuos'], ['gluteo', 'lumbar']),
  yoga('Ángulo ligado', 'Baddha Konasana', 'sentada', ['aductores'], []),
  yoga('Ángulo ligado tumbado', 'Supta Baddha Konasana', 'sentada', ['aductores'], []),
  yoga('Bastón', 'Dandasana', 'sentada', ['isquios'], ['lumbar']),
  yoga('Cara de vaca', 'Gomukhasana', 'sentada', ['gluteo', 'abductores'], ['triceps', 'hombro']),
  yoga('Mono', 'Hanumanasana', 'sentada', ['isquios', 'cuadriceps'], []),
  yoga('Cabeza a la rodilla', 'Janu Sirsasana', 'sentada', ['isquios'], ['lumbar']),
  yoga('Cabeza a la rodilla girada', 'Parivritta Janu Sirsasana', 'sentada', ['isquios', 'oblicuos'], ['dorsal']),
  yoga('Tortuga', 'Kurmasana', 'sentada', ['isquios', 'lumbar'], ['aductores']),
  yoga('Tortuga tumbada', 'Supta Kurmasana', 'sentada', ['isquios', 'lumbar'], ['aductores']),
  yoga('Gran sello', 'Mahamudra', 'sentada', ['isquios'], []),
  yoga('Barca', 'Navasana', 'sentada', ['abdomen'], ['cuadriceps']),
  yoga('Estiramiento del oeste', 'Paschimottanasana', 'sentada', ['isquios'], ['lumbar', 'gemelo']),
  yoga('Sentada en ángulo amplio', 'Upavistha Konasana', 'sentada', ['aductores', 'isquios'], []),

  // --- Yoga: de rodillas --------------------------------------------------
  yoga('Paloma real con una pierna', 'Eka Pada Rajakapotasana', 'de rodillas', ['gluteo'], ['cuadriceps']),
  yoga('Camello', 'Ustrasana', 'de rodillas', ['cuadriceps', 'abdomen'], ['pecho']),
  yoga('Niño o embrión', 'Balasana', 'de rodillas', ['lumbar'], ['dorsal']),
  yoga('León', 'Simhasana', 'de rodillas', ['cuello'], []),
  yoga('Pasador de puerta', 'Parighasana', 'de rodillas', ['oblicuos'], ['dorsal', 'aductores']),
  yoga('Héroe tendido', 'Supta Virasana', 'de rodillas', ['cuadriceps'], []),

  // --- Yoga: tumbado boca arriba ------------------------------------------
  yoga('Banco sobre dos apoyos', 'Dwi Pada Pitham', 'boca arriba', ['gluteo'], ['isquios']),
  yoga('Oreja a la rodilla', 'Karnapidasana', 'boca arriba', ['lumbar'], ['cuello', 'isquios']),
  yoga('Vishnu en el diván', 'Anantasana', 'boca arriba', ['aductores', 'isquios'], []),
  yoga('Apana', 'Apanasana', 'boca arriba', ['lumbar'], ['gluteo']),
  yoga('Arado', 'Halasana', 'boca arriba', ['lumbar', 'cuello'], ['isquios']),
  yoga('Cadáver', 'Savasana', 'boca arriba', [], []),
  yoga('Pez', 'Matsyasana', 'boca arriba', ['pecho'], ['cuello', 'abdomen']),
  yoga('Puente', 'Setu Bandhasana', 'boca arriba', ['gluteo'], ['isquios', 'lumbar']),
  yoga('Piernas en la pared', 'Viparita Karani', 'boca arriba', ['isquios'], []),
  yoga('Sobre los hombros con apoyo', 'Salamba Sarvangasana', 'boca arriba', ['cuello'], ['abdomen', 'trapecio']),
  yoga('Sobre los hombros sin apoyo de brazos', 'Niralamba Sarvangasana', 'boca arriba', ['abdomen'], ['cuello']),
  yoga('Torsión abdominal', 'Jathara Parivritti', 'boca arriba', ['oblicuos'], ['lumbar', 'gluteo']),

  // --- Yoga: tumbado boca abajo -------------------------------------------
  yoga('Langosta completa', 'Viparita Salabhasana', 'boca abajo', ['lumbar'], ['gluteo', 'isquios']),
  yoga('Cobra', 'Bhujangasana', 'boca abajo', ['lumbar'], ['abdomen', 'triceps']),
  yoga('Langosta', 'Salabhasana', 'boca abajo', ['lumbar'], ['gluteo', 'isquios']),
  yoga('Arco', 'Dhanurasana', 'boca abajo', ['lumbar', 'cuadriceps'], ['pecho', 'hombro']),

  // --- Yoga: sobre los brazos ---------------------------------------------
  yoga('Banco sobre cuatro apoyos', 'Catush Pada Pitham', 'sobre los brazos', ['gluteo'], ['isquios', 'triceps']),
  yoga('Grulla', 'Bakasana', 'sobre los brazos', ['abdomen', 'triceps'], ['antebrazo']),
  yoga('Grulla lateral', 'Parsva Bakasana', 'sobre los brazos', ['oblicuos', 'triceps'], ['antebrazo']),
  yoga('Plancha hacia arriba', 'Purvottanasana', 'sobre los brazos', ['gluteo', 'triceps'], ['hombro', 'pecho']),
  yoga('Plancha lateral del sabio', 'Vasisthasana', 'sobre los brazos', ['oblicuos'], ['hombro', 'abductores']),
  yoga('Ángulo en ocho', 'Astavakrasana', 'sobre los brazos', ['triceps', 'oblicuos'], ['pecho']),
  yoga('Árbol boca abajo', 'Adho Mukha Vrksasana', 'sobre los brazos', ['hombro'], ['triceps', 'trapecio']),
  yoga('Rueda o arco hacia arriba', 'Urdhva Dhanurasana', 'sobre los brazos', ['hombro', 'lumbar'], ['triceps', 'gluteo']),
  yoga('Báculo sobre cuatro miembros', 'Chaturanga Dandasana', 'sobre los brazos', ['pecho', 'triceps'], ['abdomen']),
  yoga('Escorpión', 'Vrschikasana', 'sobre los brazos', ['hombro', 'lumbar'], []),
  yoga('Pavo real con la cola desplegada', 'Pincha Mayurasana', 'sobre los brazos', ['hombro'], ['triceps', 'abdomen']),
  yoga('Pavo real', 'Mayurasana', 'sobre los brazos', ['antebrazo', 'abdomen'], ['triceps']),
  yoga('Perro boca abajo', 'Adho Mukha Svanasana', 'sobre los brazos', ['isquios', 'gemelo'], ['hombro', 'dorsal']),
  yoga('Perro boca arriba', 'Urdhva Mukha Svanasana', 'sobre los brazos', ['lumbar'], ['triceps', 'pecho']),
  yoga('Sobre la cabeza con apoyo', 'Salamba Sirsasana', 'sobre los brazos', ['hombro'], ['cuello', 'abdomen']),
];

// Qué clase de ejercicio es, para el filtro «Tipo».
export const TIPOS_EJERCICIO = {
  fuerza: 'Fuerza',
  cardio: 'Cardio',
  estiramiento: 'Estiramientos',
  movilidad: 'Movilidad',
  yoga: 'Yoga',
};

export function tipoDeEjercicio(ej) {
  if (['cardio', 'estiramiento', 'movilidad', 'yoga'].includes(ej?.grupo)) return ej.grupo;
  return 'fuerza';
}

// Máquinas de placas y poleas: sus pesos van de placa en placa y la
// secuencia de un drop set se puede dejar fija.
export function esMaquinaDePlacas(x) {
  return ['máquina', 'polea'].includes(x?.material);
}

// Estiramientos, movilidad y yoga no dejan fatiga en el mapa de recuperación.
export function cuentaParaFatiga(ej) {
  return !['estiramiento', 'movilidad', 'yoga'].includes(ej?.grupo);
}

export function buscarEnCatalogo(texto) {
  const f = normalizar(texto);
  if (!f) return CATALOGO;
  return CATALOGO.filter((e) => normalizar(`${e.nombre} ${e.grupo} ${e.material} ${e.familia ?? ''}`).includes(f));
}

export function normalizar(texto) {
  return (texto || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
