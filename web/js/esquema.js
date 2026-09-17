// Forma de los datos y migraciones entre versiones.
// La referencia completa está en docs/esquema-datos.md.
//
// Regla de oro: cuando cambie la forma de los datos, se sube VERSION_ACTUAL
// y se añade una función a MIGRACIONES que convierta de la versión anterior
// a la nueva. Nunca se modifica una migración ya publicada.

export const VERSION_ACTUAL = 2;

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
  libre:    { etiqueta: 'Libre',            descripcion: 'La app solo registra y te recuerda lo último que hiciste.' },
};

export const TIPOS_SERIE = {
  bilbo:         'Bilbo',
  intensidad:    'Intensidad',
  calentamiento: 'Calentamiento',
  libre:         'Libre',
};

// Técnicas de intensidad. «tramos» indica si la serie se apunta por bajadas
// o miniseries, cada una con su carga y su esfuerzo.
export const TECNICAS = {
  'drop-set':           { etiqueta: 'Drop set',           tramos: true,  bajada: 0.2 },
  'rest-pause':         { etiqueta: 'Rest-pause',         tramos: true,  bajada: 0 },
  'miorepeticiones':    { etiqueta: 'Miorrepeticiones',   tramos: true,  bajada: 0 },
  'isometrico-final':   { etiqueta: 'Isométrico final',   tramos: false },
  'excentricas-lentas': { etiqueta: 'Excéntricas lentas', tramos: false },
  'unilateral':         { etiqueta: 'Unilateral',         tramos: false },
  'fallo-tecnico':      { etiqueta: 'Fallo técnico',      tramos: false },
  'fallo-absoluto':     { etiqueta: 'Fallo absoluto',     tramos: false },
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
    default:
      return { tipo: 'libre', sobre };
  }
}

export function serieNuevaPlantilla(ejercicio, { tipo = 'libre', tecnica = null, progresion = 'libre' } = {}) {
  return {
    id: `pl_${Math.random().toString(36).slice(2, 9)}`,
    tipo,
    tecnica,
    objetivoEsfuerzo: null,
    tramosPrevistos: tecnica && TECNICAS[tecnica]?.tramos ? 3 : null,
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
