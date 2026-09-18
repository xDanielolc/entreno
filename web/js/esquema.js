// Forma de los datos y migraciones entre versiones.
// La referencia completa está en docs/esquema-datos.md.
//
// Regla de oro: cuando cambie la forma de los datos, se sube VERSION_ACTUAL
// y se añade una función a MIGRACIONES que convierta de la versión anterior
// a la nueva. Nunca se modifica una migración ya publicada.

export const VERSION_ACTUAL = 8;

export const TIPOS_CARGA = {
  peso:         { etiqueta: 'Peso',            unidad: 'kg', descripcion: 'Kilos de barra, mancuernas o máquina' },
  asistida:     { etiqueta: 'Máquina asistida', unidad: 'kg', descripcion: 'La máquina te ayuda: se resta de tu peso corporal (dominadas o fondos asistidos)' },
  pesoCorporal: { etiqueta: 'Peso corporal',   unidad: 'kg', descripcion: 'Tu propio peso, con lastre opcional' },
  altura:       { etiqueta: 'Altura',          unidad: 'cm', descripcion: 'Una medida de dificultad, como la altura del ladrillo' },
  ninguna:      { etiqueta: 'Sin carga',       unidad: '',   descripcion: 'Estiramientos, cardio, abdominales sin peso' },
};

export const TIPOS_ESFUERZO = {
  repeticiones: { etiqueta: 'Repeticiones', unidad: 'reps' },
  tiempo:       { etiqueta: 'Tiempo',       unidad: 's' },
  distancia:    { etiqueta: 'Distancia',    unidad: 'km' },
};

export const TIPOS_PROGRESION = {
  bilbo:    { etiqueta: 'Bilbo',            descripcion: 'Ciclo de días con el valor de cada día fijado de antemano. Cada día intentas superar el anterior.' },
  carga:    { etiqueta: 'Doble progresión', descripcion: 'Trabajas en un rango de repeticiones, por ejemplo de 8 a 12. Primero subes repeticiones con el mismo peso; al llegar a 12, subes peso y vuelves a empezar por 8.' },
  esfuerzo: { etiqueta: 'A más cada vez',   descripcion: 'La carga no cambia: intentas hacer algo más que la última vez.' },
  'maximo-trabajo': { etiqueta: 'Máximo trabajo', descripcion: 'Experimental: busca en tu historial el peso con el que más trabajo (peso × repeticiones) haces, y te mantiene ahí.' },
  libre:    { etiqueta: 'Libre',            descripcion: 'La app solo registra y te recuerda lo último que hiciste.' },
};

export const TIPOS_SERIE = {
  bilbo:         'Bilbo',
  intensidad:    'Intensidad',
  calentamiento: 'Calentamiento',
  libre:         'Libre',
};

// Técnicas de intensidad. Se pueden combinar varias en la misma serie
// (por ejemplo unilateral + rest-pause + isométrico final), y cada una dice
// qué se apunta:
//   tramos  la serie se parte en bajadas o miniseries, cada una con su peso
//   campos  casillas propias de esa técnica (segundos, repeticiones lentas…)
//   recamara  fija las repeticiones que dejas sin hacer (0 = hasta el fallo)
export const TECNICAS = {
  'drop-set':           { etiqueta: 'Drop set',           tramos: { nombre: 'Bajada', salto: 10 } },
  'rest-pause':         { etiqueta: 'Rest-pause',         tramos: { nombre: 'Miniserie', salto: 0 }, recamara: 0 },
  'miorepeticiones':    { etiqueta: 'Miorrepeticiones',   tramos: { nombre: 'Miniserie', salto: 0 } },
  'isometrico-final':   { etiqueta: 'Isométrico final',   campos: [{ clave: 'segundos', etiqueta: 'Isométrico', unidad: 's' }] },
  'excentricas-lentas': { etiqueta: 'Excéntricas lentas', campos: [
    { clave: 'reps', etiqueta: 'Excéntricas', unidad: 'reps' },
    { clave: 'segundos', etiqueta: 'Bajada', unidad: 's' }] },
  'unilateral':         { etiqueta: 'Unilateral',         porLado: true },
};

// El tipo de fallo no es una técnica: se deduce de las repeticiones que dejas
// en recámara. Con 0 has llegado al fallo; con 1 o más lo has dejado antes.
export function tipoDeFallo(recamara) {
  if (recamara == null) return null;
  if (recamara <= 0) return 'Fallo absoluto';
  if (recamara <= 1) return 'Casi al fallo';
  return 'Lejos del fallo';
}

// Devuelve la configuración de tramos si alguna de las técnicas la pide.
export function tramosDe(tecnicas = []) {
  for (const t of tecnicas) if (TECNICAS[t]?.tramos) return { ...TECNICAS[t].tramos, tecnica: t };
  return null;
}

export function camposDe(tecnicas = []) {
  return (tecnicas || []).flatMap((t) => (TECNICAS[t]?.campos || []).map((c) => ({ ...c, tecnica: t })));
}

// Repeticiones que se dejan en recámara: las que pide la técnica más dura, o
// las que tengas puestas por defecto en Ajustes.
export function recamaraDe(tecnicas = [], porDefecto = 1) {
  const fijadas = (tecnicas || []).map((t) => TECNICAS[t]?.recamara).filter((x) => x != null);
  return fijadas.length ? Math.min(...fijadas) : porDefecto;
}

// Estiramientos, movilidad y yoga: cómo se hacen y con qué ayuda. Se eligen
// en la ficha (lo habitual) y se pueden cambiar en cada serie.
export const TECNICAS_ESTIRAMIENTO = {
  'estatico-pasivo': { etiqueta: 'Estático pasivo', descripcion: 'Llegas a la postura y la mantienes relajado, sin hacer fuerza.' },
  'estatico-activo': { etiqueta: 'Estático activo', descripcion: 'Mantienes la postura con tu propia fuerza, sin ayuda externa.' },
  dinamico: { etiqueta: 'Dinámico', descripcion: 'Movimientos controlados hasta el final del recorrido, sin rebotes.' },
  'fnp-cr': { etiqueta: 'FNP: contracción-relajación', descripcion: 'Empujas contra la resistencia 5-10 s, sueltas y ganas recorrido.' },
  'fnp-crac': { etiqueta: 'FNP: CRAC', descripcion: 'Como contracción-relajación, y al soltar contraes el músculo contrario para llegar más lejos.' },
  pir: { etiqueta: 'Relajación postisométrica (PIR)', descripcion: 'Contracción muy suave (10-20 %) unos segundos; al soltar y espirar, avanzas.' },
  'inhibicion-reciproca': { etiqueta: 'Inhibición recíproca', descripcion: 'Contraes el músculo contrario para que el estirado se relaje.' },
  cars: { etiqueta: 'CARs', descripcion: 'Rotaciones articulares controladas: el círculo más grande posible, despacio y sin compensar.' },
  neurodinamica: { etiqueta: 'Neurodinámica', descripcion: 'Deslizamientos o tensores del nervio: movimientos suaves que no deben doler.' },
  miofascial: { etiqueta: 'Liberación miofascial', descripcion: 'Presión con rodillo o pelota sobre el músculo.' },
};

export const ASISTENCIAS = {
  ninguna: 'Sin ayuda',
  pared: 'Pared',
  ladrillo: 'Ladrillo o bloque',
  mano: 'Apoyo con la mano (escala)',
  cinta: 'Cinta',
  goma: 'Goma elástica',
  peso: 'Peso',
  silla: 'Silla o banco',
  companero: 'Compañero',
  maquina: 'Máquina',
};

// Escala de apoyo con la mano, de más ayuda a ninguna.
export const ESCALA_MANO = {
  puno: '1 · Puño',
  surf: '2 · Surf',
  pulgar: '3 · Pulgar',
  'mano-abierta': '4 · Mano abierta',
  'tres-dedos': '5 · Tres dedos',
  'dos-dedos': '6 · Dos dedos',
  'un-dedo': '7 · Un dedo',
  'sin-mano': '8 · Sin mano',
};

export const DIAS_CICLO_POR_DEFECTO = 17;

// ¿La progresión actúa sobre la carga o sobre lo que se mide?
// En cardio o estiramientos no hay carga que subir: se progresa en minutos,
// segundos o repeticiones.
export function sobrePorDefecto(ejercicio) {
  return ejercicio?.carga?.tipo === 'ninguna' ? 'esfuerzo' : 'carga';
}

export function progresionPorDefecto(tipo, ejercicio) {
  const sobre = sobrePorDefecto(ejercicio);
  switch (tipo) {
    case 'bilbo':
      return { tipo, sobre, diasPorCiclo: DIAS_CICLO_POR_DEFECTO, cicloActual: 1, ciclos: [] };
    case 'carga':
      return { tipo, sobre, objetivoEsfuerzo: [8, 12], incremento: sobre === 'carga' ? 2.5 : 1 };
    case 'esfuerzo':
      return { tipo, sobre: 'esfuerzo', incremento: 1 };
    case 'maximo-trabajo':
      return { tipo, sobre: 'carga', topeEsfuerzo: 50 };
    default:
      return { tipo: 'libre', sobre };
  }
}

export function serieNuevaPlantilla(ejercicio, { tipo = 'libre', tecnicas = [], progresion = 'libre' } = {}) {
  return {
    id: `pl_${Math.random().toString(36).slice(2, 9)}`,
    tipo,
    tecnicas,
    objetivoEsfuerzo: null,
    tramosPrevistos: null,
    tramoSalto: null,
    progresion: progresionPorDefecto(progresion, ejercicio),
  };
}

export function archivoNuevo({ nombre = '', correo = null } = {}) {
  const ahora = new Date().toISOString();
  return {
    version: VERSION_ACTUAL,
    creado: ahora,
    actualizado: ahora,
    revision: 0,
    origen: null,
    perfil: {
      nombre,
      correo,
      pesoCorporalKg: null,
      unidadPeso: 'kg',
      sedePorDefecto: null,
      tema: 'sistema',
      descansoSegundos: 120,
      recamaraPorDefecto: 1,
      dropSet: { bajadas: 4, salto: 10, inicioPorcentaje: 80, autoRellenar: true },
      descansoTramos: { 'drop-set': 30, 'rest-pause': 20, miorepeticiones: 20 },
      tramosPorDefecto: { 'rest-pause': { tramos: 3, reps: null }, miorepeticiones: { tramos: 5, reps: 5 } },
      respiracion: { veces: 3, inspirar: 4, espirar: 4 },
      recuperacion: { factores: {}, desde: {} },
    },
    sedes: [],
    ejercicios: [],
    rutinas: [],
    sesiones: [],
  };
}

// Cada entrada convierte un archivo de la versión N a la N + 1.
const MIGRACIONES = {
  // v1 → v2: la progresión pasa del ejercicio a cada serie, porque un mismo
  // ejercicio puede llevar una serie Bilbo y otra Heavy Duty que progresan
  // de forma distinta. Además se guarda si la progresión actúa sobre la
  // carga o sobre lo que se mide.
  1: (datos) => {
    const planPorEjercicio = new Map();
    for (const ej of datos.ejercicios) {
      const progresion = ej.progresion || { tipo: 'libre' };
      progresion.sobre ??= ej.carga?.tipo === 'ninguna' ? 'esfuerzo' : 'carga';
      if (progresion.tipo === 'bilbo') progresion.ciclos ??= [];
      ej.series = [{
        id: `pl_${Math.random().toString(36).slice(2, 9)}`,
        tipo: progresion.tipo === 'bilbo' ? 'bilbo' : 'libre',
        tecnica: null,
        objetivoEsfuerzo: progresion.objetivoEsfuerzo ?? null,
        tramosPrevistos: null,
        progresion,
      }];
      delete ej.progresion;
      planPorEjercicio.set(ej.id, ej.series[0].id);
    }
    // Las series ya registradas se enlazan con esa plantilla, para que el
    // historial y los ciclos sigan contando.
    for (const sesion of datos.sesiones) {
      for (const entrada of sesion.ejercicios) {
        for (const serie of entrada.series) {
          serie.tramos ??= null;
          serie.planId ??= serie.tipo === 'bilbo' ? planPorEjercicio.get(entrada.ejercicioId) ?? null : null;
        }
      }
      sesion.borrada ??= null;
    }
    datos.perfil.descansoSegundos ??= 120;
    datos.version = 2;
    return datos;
  },

  // v2 → v3: una serie puede combinar varias técnicas, cada una con sus
  // casillas, y se apuntan las repeticiones que quedan en recámara.
  2: (datos) => {
    const aLista = (x) => {
      x.tecnicas = x.tecnica ? [x.tecnica] : [];
      delete x.tecnica;
    };
    for (const ej of datos.ejercicios) for (const plan of ej.series || []) aLista(plan);
    for (const sesion of datos.sesiones) {
      for (const entrada of sesion.ejercicios) {
        for (const serie of entrada.series) {
          aLista(serie);
          serie.recamara ??= null;
          serie.detalle ??= {};
        }
      }
    }
    datos.perfil.recamaraPorDefecto ??= 1;
    datos.version = 3;
    return datos;
  },

  // v4: el fallo deja de ser técnica y pasa a la recámara; las bajadas de un
  // drop set se guardan en kilos fijos (lo que se quita de la barra).
  3: (datos) => {
    const limpiar = (x) => {
      if (!x.tecnicas) return;
      const fallo = x.tecnicas.filter((t) => t === 'fallo-tecnico' || t === 'fallo-absoluto');
      if (fallo.length) {
        x.tecnicas = x.tecnicas.filter((t) => !fallo.includes(t));
        if (x.recamara == null || fallo.includes('fallo-absoluto')) x.recamara = 0;
      }
    };
    for (const ej of datos.ejercicios) {
      for (const plan of ej.series || []) {
        limpiar(plan);
        plan.tramoSalto ??= null;
      }
    }
    for (const sesion of datos.sesiones) {
      for (const entrada of sesion.ejercicios) for (const serie of entrada.series) limpiar(serie);
    }
    datos.version = 4;
    return datos;
  },

  // v5: ajustes generales del drop set (cuántas bajadas, cuántos kilos por
  // bajada y con qué porcentaje del 1RM se arranca).
  4: (datos) => {
    datos.perfil.dropSet ??= { bajadas: 4, salto: 10, inicioPorcentaje: 80 };
    datos.version = 5;
    return datos;
  },

  // v6: cada ejercicio guarda qué músculos trabaja, para el mapa del cuerpo
  // y los avisos de volumen.
  5: (datos) => {
    for (const ej of datos.ejercicios) ej.musculos ??= { principales: [], secundarios: [] };
    datos.version = 6;
    return datos;
  },

  // v7: descansos propios dentro de una serie (entre bajadas de un drop set,
  // rest-pause y miorrepeticiones) y relleno automático del drop set con el
  // 1RM de la serie de arriba. Además se limpian los pesos «NaN» que dejaba
  // el botón «+ Bajada» de la versión anterior.
  6: (datos) => {
    datos.perfil.descansoTramos ??= { 'drop-set': 30, 'rest-pause': 20, miorepeticiones: 20 };
    datos.perfil.dropSet = { autoRellenar: true, ...datos.perfil.dropSet };
    for (const sesion of datos.sesiones) {
      for (const entrada of sesion.ejercicios) {
        for (const serie of entrada.series) {
          for (const tramo of serie.tramos || []) if (!Number.isFinite(tramo.carga)) tramo.carga = null;
        }
      }
    }
    datos.version = 7;
    return datos;
  },

  // v8: recuperación personal por músculo (factor y sensaciones al empezar),
  // valores por defecto de rest-pause y miorrepeticiones, guía de respiración,
  // y en cada plantilla de serie de dónde salen los tramos (tramosModo) y los
  // pesos fijos de las máquinas de placas (tramosFijos).
  7: (datos) => {
    datos.perfil.tramosPorDefecto ??= { 'rest-pause': { tramos: 3, reps: null }, miorepeticiones: { tramos: 5, reps: 5 } };
    datos.perfil.respiracion ??= { veces: 3, inspirar: 4, espirar: 4 };
    datos.perfil.recuperacion ??= { factores: {}, desde: {} };
    for (const ej of datos.ejercicios) {
      for (const plan of ej.series || []) {
        plan.tramosModo ??= 'ultima';
        plan.tramosFijos ??= null;
      }
    }
    datos.version = 8;
    return datos;
  },
};

export function necesitaMigrar(datos) {
  return datos.version < VERSION_ACTUAL;
}

export function migrar(original) {
  if (original.version > VERSION_ACTUAL) {
    throw new Error(
      `Estos datos son de una versión más nueva de la app (${original.version}). ` +
      'Recarga la página para actualizarla.');
  }
  let datos = structuredClone(original);
  while (datos.version < VERSION_ACTUAL) {
    const paso = MIGRACIONES[datos.version];
    if (!paso) throw new Error(`Falta la migración desde la versión ${datos.version}`);
    datos = paso(datos);
  }
  return datos;
}

// Comprobación mínima: evita abrir como datos algo que no lo es.
export function validar(datos) {
  const ok = datos && typeof datos === 'object'
    && Number.isInteger(datos.version)
    && ['ejercicios', 'rutinas', 'sesiones', 'sedes'].every((k) => Array.isArray(datos[k]))
    && datos.perfil && typeof datos.perfil === 'object';
  if (!ok) throw new Error('El archivo de datos no tiene un formato reconocible');
  return datos;
}
